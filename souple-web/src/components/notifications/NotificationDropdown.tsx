'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { notificationsApi } from '@/lib/api/notifications'
import type { Notification } from '@/lib/types'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Empty state icon ─────────────────────────────────────────────────────────

function BellOffIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  // Fetch last 10 notifications on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await notificationsApi.list({ limit: 10, perPage: 10 })
        if (!cancelled) setNotifications(res.data)
      } catch {
        // silently fail inside dropdown
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const handleRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    )
    try {
      await notificationsApi.markRead(id)
    } catch {
      // revert not strictly needed for UX; API will correct on next load
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    if (marking) return
    setMarking(true)
    try {
      await notificationsApi.markAllRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      )
    } catch {
      // silent
    } finally {
      setMarking(false)
    }
  }, [marking])

  const hasUnread = notifications.some((n) => !n.readAt)

  return (
    <div
      className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden z-50"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
          Notifications
        </h2>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            loading={marking}
            onClick={handleMarkAllRead}
            className="text-xs h-7 px-2 text-[#0A7AFF]"
          >
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-[#F3F4F6] dark:divide-[#2C2C2E]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <span className="text-[#9CA3AF] dark:text-[#6B7280] mb-2">
              <BellOffIcon />
            </span>
            <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
              Aucune notification
            </p>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
              Vous verrez vos notifications ici
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={handleRead}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {!loading && notifications.length > 0 && (
        <div className="border-t border-[#F3F4F6] dark:border-[#2C2C2E]">
          <Link
            href={`/${locale}/dashboard/notifications`}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-[#0A7AFF] hover:bg-[#F0F7FF] dark:hover:bg-[#0A7AFF]/10 transition-colors"
          >
            Voir toutes les notifications
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
