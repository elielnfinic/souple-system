import type { HttpContext } from '@adonisjs/core/http'
import messagingService from '#services/messaging_service'
import { startConversationValidator, sendMessageValidator } from '#validators/messaging_validator'

export default class ConversationsController {
  async index({ auth, request }: HttpContext) {
    const user = auth.user!
    const orgId = request.header('X-Organization-Id')
    const convs = await messagingService.getConversations(user.id, orgId ? Number(orgId) : undefined)
    return { success: true, data: convs }
  }

  async unreadCount({ auth }: HttpContext) {
    const count = await messagingService.getUnreadCount(auth.user!.id)
    return { success: true, data: { count } }
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(startConversationValidator)
    if (!data.booking_id && !data.trip_id) {
      return response.badRequest({ success: false, error: { code: 'E_CONTEXT_REQUIRED', message: 'booking_id or trip_id required' } })
    }
    const conv = await messagingService.startConversation({
      initiatorUserId: auth.user!.id,
      bookingId: data.booking_id,
      tripId: data.trip_id,
      targetUserId: data.target_user_id,
      targetOrgId: data.target_org_id,
      type: data.type,
    })
    return { success: true, data: conv }
  }

  async show({ params, auth, request }: HttpContext) {
    const page = Number(request.input('page', 1))
    const messages = await messagingService.getMessages(Number(params.id), page)
    await messagingService.markAsRead(Number(params.id), auth.user!.id)
    return { success: true, data: messages }
  }

  async sendMessage({ params, auth, request }: HttpContext) {
    const data = await request.validateUsing(sendMessageValidator)
    const message = await messagingService.sendMessage(
      Number(params.id), auth.user!.id, data.content, data.type as any
    )
    return { success: true, data: message }
  }

  async markRead({ params, auth }: HttpContext) {
    await messagingService.markAsRead(Number(params.id), auth.user!.id)
    return { success: true }
  }

  async archive({ params }: HttpContext) {
    const Conversation = (await import('#models/conversation')).default
    const conv = await Conversation.findOrFail(params.id)
    conv.status = 'archived'
    await conv.save()
    return { success: true, data: conv }
  }
}
