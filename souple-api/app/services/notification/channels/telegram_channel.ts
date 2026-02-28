import env from '#start/env'
import TelegramLink from '#models/telegram_link'
import type Notification from '#models/notification'
import type User from '#models/user'
import type { INotificationChannel, ChannelSendResult } from '#services/notification/notification_channel'

/**
 * Telegram channel — Telegram Bot API sendMessage.
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN   Bot token from @BotFather
 *
 * The user must have linked their Telegram account before this channel works.
 * If the bot token is missing or the user has no TelegramLink, gracefully returns an error result.
 */
export class TelegramChannel implements INotificationChannel {
  name = 'telegram'

  private get botToken(): string {
    return env.get('TELEGRAM_BOT_TOKEN', '') ?? ''
  }

  private isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.trim().length > 0)
  }

  private get apiBase(): string {
    return `https://api.telegram.org/bot${this.botToken}`
  }

  async send(notification: Notification, user: User): Promise<ChannelSendResult> {
    // Load the user's Telegram link
    const link = await TelegramLink.query()
      .where('user_id', user.id)
      .where('is_active', true)
      .first()

    if (!link) {
      return { success: false, error: 'User has no active Telegram link' }
    }

    if (!this.isConfigured()) {
      console.log(
        `[TelegramChannel] TELEGRAM_BOT_TOKEN not configured — stub send to chat ${link.telegramChatId}: ${notification.title}`
      )
      return { success: true, externalId: `stub-tg-${Date.now()}` }
    }

    try {
      const text = `*${this.escapeMarkdown(notification.title)}*\n\n${this.escapeMarkdown(notification.body)}`

      const response = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: link.telegramChatId,
          text,
          parse_mode: 'Markdown',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Telegram API error ${response.status}: ${errorText}`,
        }
      }

      const data = (await response.json()) as any

      if (!data?.ok) {
        return {
          success: false,
          error: `Telegram API returned ok=false: ${data?.description ?? 'unknown'}`,
        }
      }

      const messageId = String(data?.result?.message_id ?? '')
      return { success: true, externalId: messageId }
    } catch (error: any) {
      console.error(`[TelegramChannel] Send failed for user ${user.id}:`, error)
      return { success: false, error: error?.message ?? 'Unknown Telegram error' }
    }
  }

  /**
   * Escape Markdown special chars so user-facing strings don't break formatting.
   * Telegram's legacy Markdown mode only interprets _ * ` [ ] ( ) ~ > # + - = | { } . !
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*`\[\]])/g, '\\$1')
  }
}
