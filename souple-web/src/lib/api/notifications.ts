import { api } from '@/lib/api-client'
import type { Notification, NotificationPreference } from '@/lib/types'
import type { ApiList, ApiItem } from '@/lib/types'

// ─── Params ───────────────────────────────────────────────────────────────────

export interface NotificationListParams {
  page?: number
  perPage?: number
  type?: string
  status?: 'unread' | 'read' | string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export interface UpdatePreferencesData {
  preferences: Array<{
    channel: NotificationPreference['channel']
    type: string
    enabled: boolean
  }>
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: NotificationListParams) =>
    api.get<ApiList<Notification>>('/notifications', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  unreadCount: () =>
    api.get<ApiItem<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: number) =>
    api.put<ApiItem<Notification>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put<{ success: true }>('/notifications/read-all'),

  delete: (id: number) =>
    api.delete<{ success: true }>(`/notifications/${id}`),

  getPreferences: () =>
    api.get<ApiItem<NotificationPreference[]>>('/notifications/preferences'),

  updatePreferences: (data: UpdatePreferencesData) =>
    api.put<ApiItem<NotificationPreference[]>>('/notifications/preferences', data),

  telegramLink: () =>
    api.post<ApiItem<{ code: string }>>('/notifications/telegram/link'),

  telegramUnlink: () =>
    api.delete<{ success: true }>('/notifications/telegram/unlink'),

  pushSubscribe: (subscription: PushSubscriptionJSON) =>
    api.post<{ success: true }>('/notifications/push/subscribe', { subscription }),

  pushUnsubscribe: () =>
    api.delete<{ success: true }>('/notifications/push/unsubscribe'),
}
