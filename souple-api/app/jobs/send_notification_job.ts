import { Worker, type Job } from 'bullmq'
import { DateTime } from 'luxon'
import redis from '@adonisjs/redis/services/main'
import Notification from '#models/notification'
import User from '#models/user'
import { EmailChannel } from '#services/notification/channels/email_channel'
import { SmsChannel } from '#services/notification/channels/sms_channel'
import { TelegramChannel } from '#services/notification/channels/telegram_channel'
import { PushChannel } from '#services/notification/channels/push_channel'
import type { INotificationChannel } from '#services/notification/notification_channel'

// ─── Channel registry ─────────────────────────────────────────────────────────

const channelRegistry = new Map<string, INotificationChannel>([
  ['email', new EmailChannel()],
  ['sms', new SmsChannel()],
  ['telegram', new TelegramChannel()],
  ['push', new PushChannel()],
])

// ─── Job payload ─────────────────────────────────────────────────────────────

export interface SendNotificationPayload {
  notificationId: number
  channel: string
  userId: number
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/**
 * Start the BullMQ worker for the 'notifications' queue.
 *
 * Each job:
 *   1. Loads the Notification record
 *   2. Loads the User
 *   3. Resolves the channel implementation
 *   4. Calls channel.send()
 *   5. Updates the Notification: status, external_id, sent_at / error_message
 *
 * Retry: 3 attempts with exponential backoff (configured on the queue in NotificationService).
 * Concurrency: 10 concurrent jobs.
 */
export function startNotificationWorker(): Worker {
  const worker = new Worker<SendNotificationPayload>(
    'notifications',
    async (job: Job<SendNotificationPayload>) => {
      const { notificationId, channel: channelName, userId } = job.data

      // 1. Load notification record
      const notification = await Notification.find(notificationId)
      if (!notification) {
        console.warn(`[NotificationWorker] Notification ${notificationId} not found — skipping`)
        return
      }

      // 2. Load user
      const user = await User.find(userId)
      if (!user) {
        notification.status = 'failed'
        notification.errorMessage = `User ${userId} not found`
        await notification.save()
        console.warn(`[NotificationWorker] User ${userId} not found — marking notification ${notificationId} failed`)
        return
      }

      // 3. Resolve channel
      const channel = channelRegistry.get(channelName)
      if (!channel) {
        notification.status = 'failed'
        notification.errorMessage = `Unknown channel: ${channelName}`
        await notification.save()
        console.error(`[NotificationWorker] Unknown channel "${channelName}" for notification ${notificationId}`)
        return
      }

      // 4. Send
      const result = await channel.send(notification, user)

      // 5. Update notification record
      if (result.success) {
        notification.status = 'sent'
        notification.externalId = result.externalId ?? null
        notification.sentAt = DateTime.utc()
        notification.errorMessage = null
      } else {
        notification.status = 'failed'
        notification.errorMessage = result.error ?? 'Send failed with unknown error'
      }

      await notification.save()

      if (!result.success) {
        // Re-throw so BullMQ knows the job failed and can retry
        throw new Error(notification.errorMessage ?? 'Notification send failed')
      }
    },
    {
      connection: redis.connection(),
      concurrency: 10,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(
      `[NotificationWorker] Job ${job?.id ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? '?'}): ${err.message}`
    )
  })

  worker.on('completed', (job) => {
    console.info(`[NotificationWorker] Job ${job.id} completed (notification ${job.data.notificationId})`)
  })

  worker.on('error', (err) => {
    console.error('[NotificationWorker] Worker error:', err)
  })

  return worker
}
