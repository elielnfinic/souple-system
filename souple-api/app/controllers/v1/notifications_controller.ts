import type { HttpContext } from '@adonisjs/core/http'
import { NotificationService } from '#services/notification_service'
import Notification from '#models/notification'
import type User from '#models/user'

const notificationService = new NotificationService()

export default class NotificationsController {
  /**
   * GET /api/v1/notifications
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const paginated = await Notification.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

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

  /**
   * GET /api/v1/notifications/unread-count
   */
  async unreadCount({ auth, response }: HttpContext) {
    const user = auth.user! as User
    const count = await notificationService.getUnreadCount(user.id)
    return response.ok({ success: true, data: { count } })
  }

  /**
   * PUT /api/v1/notifications/mark-all-read
   */
  async markAllRead({ auth, response }: HttpContext) {
    const user = auth.user! as User
    await notificationService.markAllRead(user.id)
    return response.ok({ success: true, data: { message: 'All notifications marked as read' } })
  }

  /**
   * PUT /api/v1/notifications/:id/read
   */
  async markRead({ auth, params, response }: HttpContext) {
    const user = auth.user! as User
    await notificationService.markRead(Number(params.id), user.id)
    return response.ok({ success: true, data: { message: 'Notification marked as read' } })
  }

  /**
   * GET /api/v1/notifications/preferences
   */
  async getPreferences({ auth, response }: HttpContext) {
    const user = auth.user! as User
    const prefs = await notificationService.getPreferences(user.id)
    return response.ok({ success: true, data: prefs })
  }

  /**
   * PUT /api/v1/notifications/preferences
   */
  async updatePreferences({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, boolean>
    const prefs = await notificationService.updatePreferences(user.id, body)
    return response.ok({ success: true, data: prefs })
  }
}
