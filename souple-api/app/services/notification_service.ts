import { Queue } from 'bullmq'
import redis from '@adonisjs/redis/services/main'
import Notification from '#models/notification'
import NotificationPreference from '#models/notification_preference'
import type { NotificationChannel } from '#models/notification'

// ─── Params ──────────────────────────────────────────────────────────────────

export interface NotifyParams {
  userId: number
  type: string
  title: string
  body: string
  data?: Record<string, any>
  /** Override which channels to use. If omitted, resolved from user preferences. */
  channels?: NotificationChannel[]
  organizationId?: number
}

export interface BroadcastParams {
  userIds: number[]
  type: string
  title: string
  body: string
  data?: Record<string, any>
  organizationId?: number
}

// ─── Defaults ────────────────────────────────────────────────────────────────

/** Default channels used when a user has no preference rows. */
const DEFAULT_CHANNELS: NotificationChannel[] = ['email', 'sms']

// ─── Service ─────────────────────────────────────────────────────────────────

export class NotificationService {
  private queue: Queue

  constructor() {
    // BullMQ queue backed by Redis — reuses the AdonisJS Redis connection
    this.queue = new Queue('notifications', {
      connection: redis.connection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    })
  }

  /**
   * Send a notification to a single user across their preferred (or specified) channels.
   *
   * Steps:
   *   1. Resolve channels — explicit override or loaded from preferences
   *   2. For each enabled channel:
   *      a. Create Notification record (status: pending)
   *      b. Update status to 'queued'
   *      c. Enqueue a BullMQ job { notificationId, channel, userId }
   */
  async notify(params: NotifyParams): Promise<void> {
    const channels = params.channels ?? (await this.getChannelsForUser(params.userId, params.type))

    await Promise.allSettled(
      channels.map(async (channel) => {
        try {
          // a. Create notification record
          const notification = await Notification.create({
            userId: params.userId,
            organizationId: params.organizationId ?? null,
            channel,
            type: params.type,
            title: params.title,
            body: params.body,
            data: params.data ?? null,
            status: 'pending',
            errorMessage: null,
            externalId: null,
            sentAt: null,
            deliveredAt: null,
            readAt: null,
          })

          // b. Mark as queued
          notification.status = 'queued'
          await notification.save()

          // c. Enqueue job
          await this.queue.add(
            'send_notification',
            {
              notificationId: notification.id,
              channel,
              userId: params.userId,
            },
            {
              jobId: `notif-${notification.id}`,
            }
          )
        } catch (error) {
          console.error(
            `[NotificationService] Failed to enqueue ${channel} notification for user ${params.userId}:`,
            error
          )
        }
      })
    )
  }

  /**
   * Broadcast the same notification to multiple users.
   * Uses Promise.allSettled so a single-user failure never blocks others.
   */
  async broadcast(params: BroadcastParams): Promise<void> {
    await Promise.allSettled(
      params.userIds.map((userId) =>
        this.notify({
          userId,
          type: params.type,
          title: params.title,
          body: params.body,
          data: params.data,
          organizationId: params.organizationId,
        })
      )
    )
  }

  /**
   * Resolve which channels are enabled for a user + notification type.
   *
   * Lookup order:
   *   1. Specific (user_id, channel, type) row
   *   2. Wildcard (user_id, channel, '*') row
   *   3. DEFAULT_CHANNELS if no preferences exist at all
   */
  async getChannelsForUser(userId: number, type: string): Promise<NotificationChannel[]> {
    const ALL_CHANNELS: NotificationChannel[] = ['email', 'sms', 'telegram', 'push']

    const prefs = await NotificationPreference.query().where('user_id', userId)

    if (prefs.length === 0) {
      // No preferences configured — fall back to defaults
      return [...DEFAULT_CHANNELS]
    }

    const enabledChannels: NotificationChannel[] = []

    for (const channel of ALL_CHANNELS) {
      // Check specific type preference first
      const specific = prefs.find((p) => p.channel === channel && p.type === type)
      if (specific !== undefined) {
        if (specific.enabled) enabledChannels.push(channel)
        continue
      }

      // Fall back to wildcard
      const wildcard = prefs.find((p) => p.channel === channel && p.type === '*')
      if (wildcard !== undefined) {
        if (wildcard.enabled) enabledChannels.push(channel)
        continue
      }

      // No pref at all for this channel — include it if it's a default channel
      if (DEFAULT_CHANNELS.includes(channel)) {
        enabledChannels.push(channel)
      }
    }

    return enabledChannels
  }
}

export default new NotificationService()
