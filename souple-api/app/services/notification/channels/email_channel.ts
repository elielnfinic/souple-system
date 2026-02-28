import env from '#start/env'
import type Notification from '#models/notification'
import type User from '#models/user'
import type { INotificationChannel, ChannelSendResult } from '#services/notification/notification_channel'

/**
 * Email channel — uses AdonisJS Mail (SMTP).
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
 *
 * Gracefully degrades (logs to console) when SMTP is not configured.
 */
export class EmailChannel implements INotificationChannel {
  name = 'email'

  private isConfigured(): boolean {
    const host = env.get('SMTP_HOST')
    return Boolean(host && host.trim().length > 0)
  }

  async send(notification: Notification, user: User): Promise<ChannelSendResult> {
    if (!user.email) {
      return { success: false, error: 'No email address on user account' }
    }

    if (!this.isConfigured()) {
      console.log(
        `[EmailChannel] SMTP not configured — stub send to ${user.email}: [${notification.type}] ${notification.title}`
      )
      return { success: true, externalId: `stub-email-${Date.now()}` }
    }

    try {
      // Dynamic import to avoid breaking app startup when mail package is absent
      const mail = (await import('@adonisjs/mail/services/main')).default

      const message = await mail.send((msg) => {
        msg
          .to(user.email!)
          .from(env.get('SMTP_USERNAME', 'noreply@souple.cd'))
          .subject(notification.title)
          .text(notification.body)
          .html(this.buildHtml(notification))
      })

      // AdonisJS mail returns a MessageSentResponse with a messageId
      const externalId = (message as any)?.messageId ?? `email-${Date.now()}`

      return { success: true, externalId: String(externalId) }
    } catch (error: any) {
      console.error(`[EmailChannel] Send failed for user ${user.id}:`, error)
      return { success: false, error: error?.message ?? 'Unknown email error' }
    }
  }

  /**
   * Minimal HTML wrapper — keeps it single-source without Edge templates for now.
   * Full Edge templates (booking_confirmed.edge, etc.) can be dropped in later.
   */
  private buildHtml(notification: Notification): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${notification.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .logo { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
    .body { font-size: 15px; color: #444; line-height: 1.6; white-space: pre-wrap; }
    .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Souple</div>
    <div class="title">${notification.title}</div>
    <div class="body">${notification.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="footer">Souple — Transports intercités &middot; République Démocratique du Congo</div>
  </div>
</body>
</html>`
  }
}
