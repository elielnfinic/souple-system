import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import NotificationPreference from '#models/notification_preference'
import TelegramLink from '#models/telegram_link'
import PushSubscription from '#models/push_subscription'
import notificationService from '#services/notification_service'
import telegramBotService from '#services/telegram_bot_service'
import {
  updatePreferencesValidator,
  sendNotificationValidator,
  broadcastValidator,
  pushSubscribeValidator,
} from '#validators/notification_validator'

export default class NotificationsController {
  // ─── Notification List ────────────────────────────────────────────────────

  /**
   * GET /api/v1/notifications
   *
   * Paginated list of the authenticated user's notifications.
   * Supports ?type=, ?channel=, ?unread=true, ?page=, ?per_page=
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const type = request.input('type')
    const channel = request.input('channel')
    const unreadOnly = request.input('unread') === 'true'

    const query = Notification.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')

    if (type) query.where('type', type)
    if (channel) query.where('channel', channel)
    if (unreadOnly) query.whereNull('read_at')

    const paginated = await query.paginate(page, perPage)
    const json = paginated.toJSON()

    return response.ok({
      success: true,
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    })
  }

  // ─── Unread Count ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/notifications/unread-count
   */
  async unreadCount(ctx: HttpContext) {
    const { response } = ctx
    const user = ctx.auth.user!

    const count = await Notification.query()
      .where('user_id', user.id)
      .whereNull('read_at')
      .count('id as total')

    const total = Number((count[0] as any).$extras.total ?? 0)

    return response.ok({ success: true, data: { count: total } })
  }

  // ─── Mark Single Read ─────────────────────────────────────────────────────

  /**
   * PUT /api/v1/notifications/:id/read
   */
  async markRead(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const notification = await Notification.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    if (!notification.readAt) {
      notification.readAt = DateTime.utc()
      await notification.save()
    }

    return response.ok({ success: true, data: notification })
  }

  // ─── Mark All Read ────────────────────────────────────────────────────────

  /**
   * PUT /api/v1/notifications/read-all
   */
  async markAllRead(ctx: HttpContext) {
    const { response } = ctx
    const user = ctx.auth.user!

    const now = DateTime.utc().toSQL()

    await Notification.query()
      .where('user_id', user.id)
      .whereNull('read_at')
      .update({ read_at: now })

    return response.ok({ success: true, data: { message: 'All notifications marked as read' } })
  }

  // ─── Delete Notification ──────────────────────────────────────────────────

  /**
   * DELETE /api/v1/notifications/:id
   */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const notification = await Notification.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    await notification.delete()

    return response.ok({ success: true, data: { message: 'Notification deleted' } })
  }

  // ─── Preferences ──────────────────────────────────────────────────────────

  /**
   * GET /api/v1/notifications/preferences
   */
  async getPreferences(ctx: HttpContext) {
    const { response } = ctx
    const user = ctx.auth.user!

    const prefs = await NotificationPreference.query()
      .where('user_id', user.id)
      .orderBy('channel')
      .orderBy('type')

    return response.ok({ success: true, data: prefs })
  }

  /**
   * PUT /api/v1/notifications/preferences
   *
   * Upsert an array of preferences. Each entry is { channel, type, enabled }.
   */
  async updatePreferences(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(updatePreferencesValidator)

    const saved: NotificationPreference[] = []

    for (const pref of data.preferences) {
      const record = await NotificationPreference.updateOrCreate(
        { userId: user.id, channel: pref.channel, type: pref.type },
        { enabled: pref.enabled }
      )
      saved.push(record)
    }

    return response.ok({ success: true, data: saved })
  }

  // ─── Telegram ─────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/notifications/telegram/link
   *
   * Generate a 6-character link code the user sends to the Telegram bot.
   */
  async telegramLink(ctx: HttpContext) {
    const { response } = ctx
    const user = ctx.auth.user!

    const code = await telegramBotService.generateLinkCode(user.id)

    return response.ok({
      success: true,
      data: {
        code,
        instructions: `Open the Souple Telegram bot and send: /link ${code}`,
        expiresInMinutes: 10,
      },
    })
  }

  /**
   * DELETE /api/v1/notifications/telegram/unlink
   */
  async telegramUnlink(ctx: HttpContext) {
    const { response } = ctx
    const user = ctx.auth.user!

    const link = await TelegramLink.query()
      .where('user_id', user.id)
      .where('is_active', true)
      .first()

    if (!link) {
      return response.notFound({
        success: false,
        error: { code: 'E_NOT_FOUND', message: 'No active Telegram link found' },
      })
    }

    link.isActive = false
    await link.save()

    return response.ok({ success: true, data: { message: 'Telegram account unlinked' } })
  }

  /**
   * POST /api/v1/notifications/telegram/webhook  (PUBLIC — no auth)
   *
   * Telegram calls this URL when users send messages to the bot.
   * Must return 200 quickly to avoid Telegram retrying.
   */
  async telegramWebhook(ctx: HttpContext) {
    const { request, response } = ctx

    const body = request.body()

    // Fire-and-forget — never let Telegram see a 5xx
    telegramBotService.handleWebhook(body).catch((err) => {
      console.error('[TelegramWebhook] handleWebhook error:', err)
    })

    return response.ok({ success: true })
  }

  // ─── Push Subscriptions ───────────────────────────────────────────────────

  /**
   * POST /api/v1/notifications/push/subscribe
   *
   * Register or reactivate a Web Push subscription.
   * Each unique endpoint is treated as a separate subscription.
   */
  async pushSubscribe(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(pushSubscribeValidator)

    // Upsert by endpoint — reactivate if previously deactivated
    const sub = await PushSubscription.updateOrCreate(
      { userId: user.id, endpoint: data.endpoint },
      {
        p256dhKey: data.p256dhKey,
        authKey: data.authKey,
        userAgent: data.userAgent ?? null,
        isActive: true,
      }
    )

    return response.created({ success: true, data: sub })
  }

  /**
   * DELETE /api/v1/notifications/push/unsubscribe
   *
   * Deactivate a push subscription by endpoint.
   * Body: { endpoint: string }
   */
  async pushUnsubscribe(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const endpoint = request.input('endpoint')

    if (!endpoint) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'endpoint is required' },
      })
    }

    const sub = await PushSubscription.query()
      .where('user_id', user.id)
      .where('endpoint', endpoint)
      .first()

    if (!sub) {
      return response.notFound({
        success: false,
        error: { code: 'E_NOT_FOUND', message: 'Push subscription not found' },
      })
    }

    sub.isActive = false
    await sub.save()

    return response.ok({ success: true, data: { message: 'Push subscription removed' } })
  }

  // ─── Admin: Send ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/notifications/send
   *
   * Send a notification to a single user. Super admin or org admin only.
   */
  async send(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    if (!user.isSuperAdmin && !ctx.organization) {
      return response.forbidden({
        success: false,
        error: {
          code: 'E_FORBIDDEN',
          message: 'Super admin or organization context required',
        },
      })
    }

    const data = await request.validateUsing(sendNotificationValidator)

    await notificationService.notify({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      channels: data.channels as any,
      organizationId: data.organizationId ?? ctx.organization?.id,
      data: data.data as Record<string, any> | undefined,
    })

    return response.created({
      success: true,
      data: { message: 'Notification queued for delivery' },
    })
  }

  /**
   * POST /api/v1/notifications/broadcast
   *
   * Broadcast a notification to multiple users. Super admin or org admin only.
   */
  async broadcast(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    if (!user.isSuperAdmin && !ctx.organization) {
      return response.forbidden({
        success: false,
        error: {
          code: 'E_FORBIDDEN',
          message: 'Super admin or organization context required',
        },
      })
    }

    const data = await request.validateUsing(broadcastValidator)

    await notificationService.broadcast({
      userIds: data.userIds,
      type: data.type,
      title: data.title,
      body: data.body,
      organizationId: data.organizationId ?? ctx.organization?.id,
      data: data.data as Record<string, any> | undefined,
    })

    return response.created({
      success: true,
      data: {
        message: `Notification queued for ${data.userIds.length} user(s)`,
        userCount: data.userIds.length,
      },
    })
  }
}
