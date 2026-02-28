import env from '#start/env'
import type Notification from '#models/notification'
import type User from '#models/user'
import type { INotificationChannel, ChannelSendResult } from '#services/notification/notification_channel'

/**
 * SMS channel — Africa's Talking SMS API.
 *
 * Required env vars:
 *   AT_API_KEY      Africa's Talking API key
 *   AT_USERNAME     Africa's Talking username (default: 'sandbox' for testing)
 *   AT_SENDER_ID    Shortcode or sender name (optional)
 *
 * Gracefully degrades (logs to console) when AT_API_KEY is not set.
 * Messages are truncated to 160 chars to stay within single-SMS cost.
 */
export class SmsChannel implements INotificationChannel {
  name = 'sms'

  private readonly AT_SMS_URL = 'https://api.africastalking.com/version1/messaging'
  private readonly MAX_SMS_LENGTH = 160

  private isConfigured(): boolean {
    const apiKey = env.get('AT_API_KEY', '')
    return Boolean(apiKey && apiKey.trim().length > 0)
  }

  private get apiKey(): string {
    return env.get('AT_API_KEY', '') ?? ''
  }

  private get username(): string {
    return env.get('AT_USERNAME', 'sandbox') ?? 'sandbox'
  }

  private get senderId(): string | undefined {
    const id = env.get('AT_SENDER_ID', '')
    return id && id.trim().length > 0 ? id : undefined
  }

  async send(notification: Notification, user: User): Promise<ChannelSendResult> {
    if (!user.phone) {
      return { success: false, error: 'No phone number on user account' }
    }

    // Keep SMS under 160 chars — add "Souple: " prefix
    const prefix = 'Souple: '
    const maxBody = this.MAX_SMS_LENGTH - prefix.length
    const body = `${prefix}${notification.body.slice(0, maxBody)}`

    if (!this.isConfigured()) {
      console.log(
        `[SmsChannel] AT_API_KEY not configured — stub send to ${user.phone}: ${body}`
      )
      return { success: true, externalId: `stub-sms-${Date.now()}` }
    }

    try {
      const params = new URLSearchParams({
        username: this.username,
        to: user.phone,
        message: body,
      })

      if (this.senderId) {
        params.set('from', this.senderId)
      }

      const response = await fetch(this.AT_SMS_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: this.apiKey,
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const text = await response.text()
        return { success: false, error: `AT SMS API error ${response.status}: ${text}` }
      }

      const data = (await response.json()) as any
      const recipients = data?.SMSMessageData?.Recipients ?? []
      const firstRecipient = recipients[0]

      if (!firstRecipient) {
        return { success: false, error: 'AT SMS API returned no recipients' }
      }

      if (firstRecipient.status !== 'Success') {
        return {
          success: false,
          error: `AT SMS status: ${firstRecipient.status} — ${firstRecipient.statusCode}`,
        }
      }

      return {
        success: true,
        externalId: String(firstRecipient.messageId ?? firstRecipient.messageSessionId ?? ''),
      }
    } catch (error: any) {
      console.error(`[SmsChannel] Send failed for user ${user.id}:`, error)
      return { success: false, error: error?.message ?? 'Unknown SMS error' }
    }
  }
}
