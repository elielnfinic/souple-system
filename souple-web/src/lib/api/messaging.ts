import { api } from '@/lib/api-client'
import type { Conversation, Message, CannedResponse, ApiItem } from '@/lib/types'

// ─── Messaging API ────────────────────────────────────────────────────────────

export const messagingApi = {
  // ── Conversations ────────────────────────────────────────────────────────

  unreadCount: () =>
    api.get<ApiItem<{ count: number }>>('/conversations/unread-count'),

  listConversations: (params?: { page?: number; perPage?: number }) =>
    api.get<ApiItem<Conversation[]>>('/conversations', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  startConversation: (data: {
    booking_id?: number
    trip_id?: number
    target_user_id?: number
    target_org_id?: number
    type?: 'passenger_agency' | 'passenger_driver' | 'internal'
  }) => api.post<ApiItem<Conversation>>('/conversations', data),

  getMessages: (id: number, page?: number) =>
    api.get<ApiItem<Message[]>>(`/conversations/${id}`, {
      params: page ? { page } : undefined,
    }),

  sendMessage: (id: number, content: string, type = 'text') =>
    api.post<ApiItem<Message>>(`/conversations/${id}/messages`, { content, type }),

  markRead: (id: number) =>
    api.put<{ success: true }>(`/conversations/${id}/read`),

  archive: (id: number) =>
    api.put<{ success: true }>(`/conversations/${id}/archive`),

  // ── Canned Responses ─────────────────────────────────────────────────────

  listCannedResponses: () =>
    api.get<ApiItem<CannedResponse[]>>('/org/canned-responses'),

  createCannedResponse: (data: unknown) =>
    api.post<ApiItem<CannedResponse>>('/org/canned-responses', data),

  updateCannedResponse: (id: number, data: unknown) =>
    api.put<ApiItem<CannedResponse>>(`/org/canned-responses/${id}`, data),

  deleteCannedResponse: (id: number) =>
    api.delete<{ success: true }>(`/org/canned-responses/${id}`),
}
