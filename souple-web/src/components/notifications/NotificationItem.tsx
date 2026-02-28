'use client'

import { cn } from '@/lib/utils'
import type { Notification } from '@/lib/types'

// ─── Icon map ─────────────────────────────────────────────────────────────────

function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
      <path d="M13 5v14" strokeDasharray="2 2" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 1 21 1 21 15 19 20 3 20 3 6" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="14" y2="16" />
    </svg>
  )
}

function BusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="14" rx="2" />
      <path d="M1 11h22" />
      <path d="M5 18v2M19 18v2" />
      <circle cx="7" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HandWaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11V6a2 2 0 0 1 4 0v5" />
      <path d="M13 11V8a2 2 0 0 1 4 0v3" />
      <path d="M5 11V9a2 2 0 0 1 4 0v2" />
      <path d="M5 11c0 6 3 9 9 9s9-3 9-9v-1a2 2 0 0 0-4 0" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ─── Icon selector ────────────────────────────────────────────────────────────

function getIcon(type: string): { icon: React.ReactNode; bg: string; color: string } {
  if (type === 'booking_confirmed') {
    return {
      icon: <TicketIcon />,
      bg: 'bg-[#EFF6FF] dark:bg-[#0A7AFF]/15',
      color: 'text-[#0A7AFF]',
    }
  }
  if (type === 'payment_receipt') {
    return {
      icon: <ReceiptIcon />,
      bg: 'bg-[#F0FDF4] dark:bg-[#16A34A]/15',
      color: 'text-[#16A34A]',
    }
  }
  if (type.startsWith('trip_')) {
    return {
      icon: <BusIcon />,
      bg: 'bg-[#FFF7ED] dark:bg-[#F59E0B]/15',
      color: 'text-[#F59E0B]',
    }
  }
  if (type === 'welcome') {
    return {
      icon: <HandWaveIcon />,
      bg: 'bg-[#FDF4FF] dark:bg-[#A855F7]/15',
      color: 'text-[#A855F7]',
    }
  }
  if (type === 'otp') {
    return {
      icon: <LockIcon />,
      bg: 'bg-[#FEF2F2] dark:bg-[#DC2626]/15',
      color: 'text-[#DC2626]',
    }
  }
  return {
    icon: <BellIcon />,
    bg: 'bg-[#F3F4F6] dark:bg-[#374151]',
    color: 'text-[#6B7280]',
  }
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return "à l'instant"
  if (diffSec < 3600) {
    const min = Math.floor(diffSec / 60)
    return `il y a ${min} min`
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    return `il y a ${h}h`
  }
  const days = Math.floor(diffSec / 86400)
  if (days === 1) return 'hier'
  return `il y a ${days}j`
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NotificationItemProps {
  notification: Notification
  onRead?: (id: number) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const isUnread = !notification.readAt
  const { icon, bg, color } = getIcon(notification.type)

  function handleClick() {
    if (isUnread && onRead) {
      onRead(notification.id)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100',
        isUnread
          ? 'bg-[#F0F7FF] dark:bg-[#0A7AFF]/8 hover:bg-[#E0EFFF] dark:hover:bg-[#0A7AFF]/12'
          : 'bg-white dark:bg-transparent hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937]'
      )}
      aria-label={`Notification: ${notification.title}`}
    >
      {/* Icon */}
      <span
        className={cn(
          'shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center',
          bg,
          color
        )}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug truncate',
            isUnread
              ? 'font-semibold text-[#111827] dark:text-[#F9FAFB]'
              : 'font-medium text-[#374151] dark:text-[#D1D5DB]'
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2 leading-relaxed">
          {notification.body}
        </p>
        <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
          {relativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <span
          className="shrink-0 mt-2 w-2 h-2 rounded-full bg-[#0A7AFF]"
          aria-label="Non lu"
        />
      )}
    </button>
  )
}
