'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { notificationsApi } from '@/lib/api/notifications'
import { NotificationDropdown } from './NotificationDropdown'
import { cn } from '@/lib/utils'

// ─── Bell SVG ─────────────────────────────────────────────────────────────────

function BellSvg({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth={hasUnread ? '2' : '1.75'}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch unread count on mount, then poll every 60 seconds
  const fetchCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount()
      setUnreadCount(res.data.count)
    } catch {
      // fail silently — bell still renders without count
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Close on outside click
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount)
  const hasUnread = unreadCount > 0

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative p-2 rounded-md transition-colors',
          'text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]',
          'hover:text-[#374151] dark:hover:text-[#D1D5DB]',
          open && 'bg-[#F3F4F6] dark:bg-[#1F2937] text-[#374151] dark:text-[#D1D5DB]'
        )}
        aria-label={
          hasUnread
            ? `Notifications — ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellSvg hasUnread={hasUnread} />

        {/* Unread badge */}
        {hasUnread && (
          <span
            className={cn(
              'absolute flex items-center justify-center',
              'bg-[#DC2626] text-white ring-2 ring-white dark:ring-[#111111]',
              'font-bold leading-none rounded-full',
              unreadCount > 9
                ? 'text-[9px] min-w-[18px] h-[18px] px-1 -top-0.5 -right-0.5'
                : 'text-[9px] w-4 h-4 -top-0.5 -right-0.5'
            )}
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && <NotificationDropdown />}
    </div>
  )
}
