'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'warning' | 'danger' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  /** Auto-dismiss after ms. Set to 0 to keep until manually dismissed. */
  duration?: number
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = React.useCallback(
    (opts: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const duration = opts.duration ?? 4500

      setToasts((prev) => {
        // Cap at 5 visible toasts — drop oldest
        const next = [...prev, { ...opts, id, duration }]
        return next.length > 5 ? next.slice(next.length - 5) : next
      })

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
    },
    [dismiss]
  )

  // Clean up timers on unmount
  React.useEffect(() => {
    const t = timers.current
    return () => t.forEach((timer) => clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  )
}

// ─── Toast card ───────────────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, { icon: React.ReactNode; bar: string; bg: string; title: string }> = {
  success: {
    bar: 'bg-[#16A34A]',
    bg: 'bg-white dark:bg-[#1F2937]',
    title: 'text-[#111827] dark:text-[#F9FAFB]',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#16A34A] shrink-0">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  warning: {
    bar: 'bg-[#F59E0B]',
    bg: 'bg-white dark:bg-[#1F2937]',
    title: 'text-[#111827] dark:text-[#F9FAFB]',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#F59E0B] shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  danger: {
    bar: 'bg-[#DC2626]',
    bg: 'bg-white dark:bg-[#1F2937]',
    title: 'text-[#111827] dark:text-[#F9FAFB]',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#DC2626] shrink-0">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-[#2563EB]',
    bg: 'bg-white dark:bg-[#1F2937]',
    title: 'text-[#111827] dark:text-[#F9FAFB]',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#2563EB] shrink-0">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const s = variantStyles[item.variant]

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl shadow-lg border border-[#E5E7EB] dark:border-[#374151]',
        'overflow-hidden pl-1 pr-4 py-3',
        s.bg,
        'animate-in slide-in-from-bottom-2 fade-in duration-200'
      )}
    >
      {/* Accent bar */}
      <div className={cn('w-1 self-stretch rounded-full shrink-0', s.bar)} />

      {s.icon}

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold leading-snug', s.title)}>{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-snug">{item.description}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="mt-0.5 text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors duration-100 shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────
// Inline persistent banner — no portal, no auto-dismiss.

export interface AlertBannerProps {
  variant: ToastVariant
  title: string
  description?: string
  onDismiss?: () => void
  className?: string
  /** Action rendered alongside the dismiss button */
  action?: React.ReactNode
}

export function AlertBanner({ variant, title, description, onDismiss, className, action }: AlertBannerProps) {
  const s = variantStyles[variant]
  const bannerBg: Record<ToastVariant, string> = {
    success: 'bg-[#DCFCE7] dark:bg-[#14532D]/40 border-[#16A34A]/30',
    warning: 'bg-[#FEF3C7] dark:bg-[#451A03]/40 border-[#F59E0B]/30',
    danger:  'bg-[#FEE2E2] dark:bg-[#450A0A]/40 border-[#DC2626]/30',
    info:    'bg-[#DBEAFE] dark:bg-[#1E3A5F]/40 border-[#2563EB]/30',
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        bannerBg[variant],
        className
      )}
    >
      {s.icon}

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', s.title)}>{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-[#4B5563] dark:text-[#D1D5DB]">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors duration-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
