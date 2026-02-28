import { DateTime } from 'luxon'
import Notification from '#models/notification'
import NotificationPreference from '#models/notification_preference'
import type { NotificationChannel } from '#models/notification'

export interface SendNotificationParams {
  userId?: number
  title: string
  body: string
  type: string
  channels: Array<NotificationChannel>
  data?: Record<string, any>
}

export class NotificationService {
  async send(params: SendNotificationParams): Promise<void> {
    for (const channel of params.channels) {
      // For non-in_app channels, check user preferences first
      if (params.userId && channel !== 'in_app') {
        const prefs = await this.getPreferences(params.userId)
        if (!this.#isChannelEnabled(channel, params.type, prefs)) continue
      }

      const notification = await Notification.create({
        userId: params.userId ?? null,
        title: params.title,
        body: params.body,
        channel,
        type: params.type,
        status: 'pending',
        data: params.data ?? null,
      })

      await this.#dispatch(notification)
    }
  }

  async getUnread(userId: number): Promise<Notification[]> {
    return Notification.query()
      .where('user_id', userId)
      .whereNull('read_at')
      .whereNot('status', 'failed')
      .orderBy('created_at', 'desc')
  }

  async markRead(notificationId: number, userId: number): Promise<void> {
    const notification = await Notification.query()
      .where('id', notificationId)
      .where('user_id', userId)
      .firstOrFail()

    notification.readAt = DateTime.now()
    notification.status = 'read'
    await notification.save()
  }

  async markAllRead(userId: number): Promise<void> {
    await Notification.query()
      .where('user_id', userId)
      .whereNull('read_at')
      .update({ read_at: DateTime.now().toSQL(), status: 'read' })
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await Notification.query()
      .where('user_id', userId)
      .whereNull('read_at')
      .whereNot('status', 'failed')
      .count('* as total')
    return Number((result[0] as any).$extras.total)
  }

  async getPreferences(userId: number): Promise<NotificationPreference> {
    let prefs = await NotificationPreference.findBy('user_id', userId)
    if (!prefs) {
      prefs = await NotificationPreference.create({
        userId,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        telegramEnabled: false,
        bookingUpdates: true,
        tripUpdates: true,
        promotions: false,
        news: false,
      })
    }
    return prefs
  }

  async updatePreferences(
    userId: number,
    updates: Partial<{
      emailEnabled: boolean
      smsEnabled: boolean
      pushEnabled: boolean
      telegramEnabled: boolean
      bookingUpdates: boolean
      tripUpdates: boolean
      promotions: boolean
      news: boolean
    }>
  ): Promise<NotificationPreference> {
    const prefs = await this.getPreferences(userId)
    prefs.merge(updates)
    await prefs.save()
    return prefs
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  #isChannelEnabled(
    channel: NotificationChannel,
    type: string,
    prefs: NotificationPreference
  ): boolean {
    // Check channel-level toggle
    if (channel === 'email' && !prefs.emailEnabled) return false
    if (channel === 'sms' && !prefs.smsEnabled) return false
    if (channel === 'push' && !prefs.pushEnabled) return false
    if (channel === 'telegram' && !prefs.telegramEnabled) return false

    // Check type-level preference
    if (['booking_confirmed', 'booking_cancelled', 'payment_succeeded'].includes(type)) {
      return prefs.bookingUpdates
    }
    if (['trip_departure_reminder', 'trip_delayed', 'trip_cancelled'].includes(type)) {
      return prefs.tripUpdates
    }
    if (type === 'promotion') return prefs.promotions
    if (type === 'news') return prefs.news

    return true
  }

  async #dispatch(notification: Notification): Promise<void> {
    try {
      if (notification.channel === 'in_app') {
        // In-app: record is already persisted; client polls or uses SSE
        notification.status = 'sent'
        notification.sentAt = DateTime.now()
        await notification.save()
        return
      }

      // For other channels: stub dispatch (real integrations go here)
      // SMS: e.g. call Twilio / local SMS gateway
      // Email: e.g. call SendGrid / SMTP
      // Push: e.g. call FCM
      // Telegram: e.g. call Telegram Bot API
      notification.status = 'sent'
      notification.sentAt = DateTime.now()
      await notification.save()
    } catch (err: any) {
      notification.status = 'failed'
      notification.failedReason = err?.message ?? 'Unknown error'
      await notification.save()
    }
  }
}
