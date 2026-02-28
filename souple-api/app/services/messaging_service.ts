import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'
import CannedResponse from '#models/canned_response'
import { filterContent } from './messaging/content_filter.js'
import { DateTime } from 'luxon'

export class MessagingService {
  async startConversation(params: {
    initiatorUserId: number
    bookingId?: number
    tripId?: number
    targetUserId?: number
    targetOrgId?: number
    type: 'passenger_agency' | 'passenger_driver' | 'internal'
  }): Promise<Conversation> {
    // Check for existing conversation
    const existing = await Conversation.query()
      .where('participant_a_id', params.initiatorUserId)
      .where('status', '!=', 'blocked')
      .if(params.bookingId, q => q.where('booking_id', params.bookingId!))
      .if(params.tripId && !params.bookingId, q => q.where('trip_id', params.tripId!))
      .if(params.targetOrgId, q => q.where('participant_b_org_id', params.targetOrgId!))
      .if(params.targetUserId, q => q.where('participant_b_id', params.targetUserId!))
      .first()

    if (existing) return existing

    return Conversation.create({
      bookingId: params.bookingId ?? null,
      tripId: params.tripId ?? null,
      type: params.type,
      participantAId: params.initiatorUserId,
      participantBId: params.targetUserId ?? null,
      participantBOrgId: params.targetOrgId ?? null,
      status: 'active',
    })
  }

  async sendMessage(
    conversationId: number,
    senderId: number,
    content: string,
    type: 'text' | 'image' | 'system' = 'text'
  ): Promise<Message> {
    const { filtered, hadContactInfo } = filterContent(content)
    if (hadContactInfo) console.warn(`[Messaging] Contact info filtered from user ${senderId}`)

    const message = await Message.create({
      conversationId,
      senderId,
      content: filtered,
      type,
      isRead: false,
    })

    await Conversation.query()
      .where('id', conversationId)
      .update({ last_message_at: DateTime.utc().toSQL() })

    return message
  }

  async getConversations(userId: number, orgId?: number) {
    const query = Conversation.query()
      .preload('participantA')
      .preload('participantBOrg')
      .orderBy('last_message_at', 'desc')

    if (orgId) {
      query.where(q =>
        q.where('participant_a_id', userId)
         .orWhere('participant_b_id', userId)
         .orWhere('participant_b_org_id', orgId)
      )
    } else {
      query.where(q =>
        q.where('participant_a_id', userId).orWhere('participant_b_id', userId)
      )
    }

    const conversations = await query

    // Attach unread count for each conversation
    return Promise.all(conversations.map(async (c) => {
      const unread = await Message.query()
        .where('conversation_id', c.id)
        .where('sender_id', '!=', userId)
        .where('is_read', false)
        .count('* as total')
      const lastMessage = await Message.query()
        .where('conversation_id', c.id)
        .orderBy('created_at', 'desc')
        .first()
      return Object.assign(c, {
        unreadCount: Number((unread[0] as any).$extras.total ?? 0),
        lastMessage,
      })
    }))
  }

  async getMessages(conversationId: number, page = 1, limit = 50) {
    return Message.query()
      .where('conversation_id', conversationId)
      .preload('sender')
      .orderBy('created_at', 'asc')
      .paginate(page, limit)
  }

  async markAsRead(conversationId: number, userId: number): Promise<void> {
    await db
      .from('messages')
      .where('conversation_id', conversationId)
      .where('sender_id', '!=', userId)
      .where('is_read', false)
      .update({ is_read: true, read_at: DateTime.utc().toSQL() })
  }

  async getUnreadCount(userId: number): Promise<number> {
    const conversations = await Conversation.query()
      .where(q => q.where('participant_a_id', userId).orWhere('participant_b_id', userId))
      .select('id')

    if (!conversations.length) return 0

    const ids = conversations.map(c => c.id)
    const result = await Message.query()
      .whereIn('conversation_id', ids)
      .where('sender_id', '!=', userId)
      .where('is_read', false)
      .count('* as total')

    return Number((result[0] as any).$extras.total ?? 0)
  }

  async sendSystemMessage(conversationId: number, content: string): Promise<Message> {
    // Use a placeholder sender_id — system messages use sender_id of participant_a
    const conv = await Conversation.findOrFail(conversationId)
    return this.sendMessage(conversationId, conv.participantAId, content, 'system')
  }

  async getCannedResponses(orgId: number | null, locale = 'fr') {
    return CannedResponse.query()
      .where('is_active', true)
      .where(q => q.whereNull('organization_id').orWhere('organization_id', orgId ?? 0))
      .orderBy('sort_order', 'asc')
  }
}

export default new MessagingService()
