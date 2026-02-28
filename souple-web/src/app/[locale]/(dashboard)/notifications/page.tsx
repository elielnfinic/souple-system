'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: number
  title: string
  body: string
  createdAt: string
  readAt: string | null
}

interface NotificationsResponse {
  success: true
  data: { items: Notification[]; meta: { total: number } }
}

interface MarkReadResponse {
  success: true
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<NotificationsResponse>('/notifications')
        setNotifications(res.data.items)
      } catch {
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function markAllRead() {
    setMarking(true)
    try {
      await api.post<MarkReadResponse>('/notifications/mark-all-read')
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      )
    } catch {
      // ignore
    } finally {
      setMarking(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Notifications
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<CheckCheck size={14} />}
            onClick={markAllRead}
            loading={marking}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] divide-y divide-[#E5E7EB] dark:divide-[#374151] overflow-hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-4 animate-pulse">
              <div className="mt-0.5 h-8 w-8 rounded-full bg-[#E5E7EB] dark:bg-[#374151] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-[#E5E7EB] dark:bg-[#374151]" />
                <div className="h-3 w-full rounded bg-[#E5E7EB] dark:bg-[#374151]" />
                <div className="h-3 w-16 rounded bg-[#E5E7EB] dark:bg-[#374151]" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Bell size={32} className="text-[#D1D5DB] dark:text-[#4B5563]" />
            <p className="text-sm text-[#9CA3AF]">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex gap-3 px-4 py-4 transition-colors',
                !n.readAt && 'bg-[#EFF6FF] dark:bg-[#1E3A5F]/30'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                n.readAt
                  ? 'bg-[#F3F4F6] dark:bg-[#374151]'
                  : 'bg-[#DBEAFE] dark:bg-[#1E3A5F]'
              )}>
                <Bell
                  size={14}
                  className={n.readAt
                    ? 'text-[#9CA3AF] dark:text-[#6B7280]'
                    : 'text-[#2563EB] dark:text-[#60A5FA]'}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    'text-sm',
                    n.readAt
                      ? 'text-[#374151] dark:text-[#D1D5DB]'
                      : 'font-semibold text-[#111827] dark:text-[#F9FAFB]'
                  )}>
                    {n.title}
                  </p>
                  {!n.readAt && (
                    <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-[#2563EB]" aria-label="Unread" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2">
                  {n.body}
                </p>
                <p className="mt-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  {relativeTime(n.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
