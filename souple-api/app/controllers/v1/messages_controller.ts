import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import Message from '#models/message'
import type User from '#models/user'

export default class MessagesController {
  /**
   * GET /api/v1/conversations
   */
  async conversations({ auth, response }: HttpContext) {
    const user = auth.user! as User

    const participantRows = await ConversationParticipant.query()
      .where('user_id', user.id)
      .select('conversation_id')

    const conversationIds = participantRows.map((p) => p.conversationId)

    if (conversationIds.length === 0) {
      return response.ok({ success: true, data: [] })
    }

    const conversations = await Conversation.query()
      .whereIn('id', conversationIds)
      .where('is_active', true)
      .preload('participants', (q) => q.preload('user'))
      .orderBy('last_message_at', 'desc')

    return response.ok({ success: true, data: conversations })
  }

  /**
   * POST /api/v1/conversations
   */
  async createConversation({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const conversation = await Conversation.create({
      organizationId: body.organizationId ?? null,
      bookingId: body.bookingId ?? null,
      type: body.type ?? 'direct',
      title: body.title ?? null,
      isActive: true,
      lastMessageAt: null,
    })

    await ConversationParticipant.create({
      conversationId: conversation.id,
      userId: user.id,
      unreadCount: 0,
      lastReadAt: null,
    })

    if (body.participantIds && Array.isArray(body.participantIds)) {
      for (const participantId of body.participantIds) {
        if (participantId !== user.id) {
          await ConversationParticipant.create({
            conversationId: conversation.id,
            userId: participantId,
            unreadCount: 0,
            lastReadAt: null,
          })
        }
      }
    }

    return response.created({ success: true, data: conversation })
  }

  /**
   * GET /api/v1/conversations/:id/messages
   */
  async getMessages({ params, auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 50))

    await ConversationParticipant.query()
      .where('conversation_id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    const paginated = await Message.query()
      .where('conversation_id', params.id)
      .where('is_deleted', false)
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
   * POST /api/v1/conversations/:id/messages
   */
  async sendMessage({ params, auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    await ConversationParticipant.query()
      .where('conversation_id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    const message = await Message.create({
      conversationId: Number(params.id),
      senderUserId: user.id,
      content: body.content,
      type: body.type ?? 'text',
      isDeleted: false,
    })

    await Conversation.query()
      .where('id', params.id)
      .update({ last_message_at: DateTime.now().toSQL() })

    await ConversationParticipant.query()
      .where('conversation_id', params.id)
      .whereNot('user_id', user.id)
      .increment('unread_count', 1)

    return response.created({ success: true, data: message })
  }

  /**
   * PUT /api/v1/conversations/:id/read
   */
  async markRead({ params, auth, response }: HttpContext) {
    const user = auth.user! as User

    const participant = await ConversationParticipant.query()
      .where('conversation_id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    participant.unreadCount = 0
    participant.lastReadAt = DateTime.now()
    await participant.save()

    return response.ok({ success: true, data: participant })
  }
}
