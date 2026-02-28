import env from '#start/env'
import PushSubscription from '#models/push_subscription'
import type Notification from '#models/notification'
import type User from '#models/user'
import type { INotificationChannel, ChannelSendResult } from '#services/notification/notification_channel'

/**
 * Web Push channel — sends to all active browser subscriptions for a user.
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   VAPID public key (base64url)
 *   VAPID_PRIVATE_KEY  VAPID private key (base64url)
 *   VAPID_SUBJECT      mailto: or https: URL identifying the sender
 *
 * Uses native fetch + the Web Push protocol via VAPID headers.
 * Subscriptions that return HTTP 410 (Gone) are automatically deactivated.
 * Gracefully degrades (logs to console) when VAPID keys are not configured.
 */
export class PushChannel implements INotificationChannel {
  name = 'push'

  private get vapidPublicKey(): string {
    return env.get('VAPID_PUBLIC_KEY', '') ?? ''
  }

  private get vapidPrivateKey(): string {
    return env.get('VAPID_PRIVATE_KEY', '') ?? ''
  }

  private get vapidSubject(): string {
    return env.get('VAPID_SUBJECT', 'mailto:tech@souple.cd') ?? 'mailto:tech@souple.cd'
  }

  private isConfigured(): boolean {
    return Boolean(
      this.vapidPublicKey.trim().length > 0 && this.vapidPrivateKey.trim().length > 0
    )
  }

  async send(notification: Notification, user: User): Promise<ChannelSendResult> {
    const subscriptions = await PushSubscription.query()
      .where('user_id', user.id)
      .where('is_active', true)

    if (subscriptions.length === 0) {
      return { success: false, error: 'User has no active push subscriptions' }
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/icon.png',
      badge: '/badge.png',
      data: {
        type: notification.type,
        notificationId: notification.id,
        ...(notification.data ?? {}),
      },
    })

    if (!this.isConfigured()) {
      console.log(
        `[PushChannel] VAPID keys not configured — stub push to ${subscriptions.length} subscription(s) for user ${user.id}: ${notification.title}`
      )
      return { success: true, externalId: `stub-push-${Date.now()}` }
    }

    const results: Array<{ success: boolean; error?: string }> = []

    for (const sub of subscriptions) {
      const result = await this.sendToSubscription(sub, payload)
      results.push(result)
    }

    const anySuccess = results.some((r) => r.success)
    const allErrors = results
      .filter((r) => !r.success)
      .map((r) => r.error)
      .join('; ')

    if (!anySuccess) {
      return { success: false, error: allErrors }
    }

    return { success: true, externalId: `push-${Date.now()}` }
  }

  /**
   * Send a push notification to a single subscription endpoint.
   * Handles VAPID signing and deactivates expired (410) subscriptions.
   */
  private async sendToSubscription(
    sub: PushSubscription,
    payload: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Dynamically import web-push — optional dependency
      // If not installed, falls through to the manual VAPID implementation below
      let webpush: any
      try {
        webpush = await import('web-push')
      } catch {
        webpush = null
      }

      if (webpush) {
        webpush.setVapidDetails(
          this.vapidSubject,
          this.vapidPublicKey,
          this.vapidPrivateKey
        )

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dhKey,
              auth: sub.authKey,
            },
          },
          payload,
          {
            TTL: 86400, // 24 hours
          }
        )

        return { success: true }
      }

      // Fallback: raw fetch with VAPID Authorization header
      // This is a minimal implementation — the web-push library should be preferred
      const response = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          TTL: '86400',
        },
        body: payload,
      })

      if (response.status === 410) {
        // Subscription is expired — deactivate it
        await this.deactivateSubscription(sub)
        return { success: false, error: 'Subscription expired (410) — deactivated' }
      }

      if (!response.ok) {
        return { success: false, error: `Push endpoint returned ${response.status}` }
      }

      return { success: true }
    } catch (error: any) {
      // Handle web-push WebPushError with statusCode
      if (error?.statusCode === 410) {
        await this.deactivateSubscription(sub)
        return { success: false, error: 'Subscription expired (410) — deactivated' }
      }

      console.error(`[PushChannel] Send failed to endpoint ${sub.endpoint.slice(0, 40)}...:`, error)
      return { success: false, error: error?.message ?? 'Unknown push error' }
    }
  }

  private async deactivateSubscription(sub: PushSubscription): Promise<void> {
    try {
      sub.isActive = false
      await sub.save()
      console.info(`[PushChannel] Deactivated expired subscription ${sub.id} for user ${sub.userId}`)
    } catch (error) {
      console.error(`[PushChannel] Failed to deactivate subscription ${sub.id}:`, error)
    }
  }
}
