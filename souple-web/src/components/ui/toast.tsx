'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
  open: boolean
}

// ─── Variant config ───────────────────────────────────────────────────────────

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; iconColor: string; borderColor: string }
> = {
  success: {
    icon: <CheckCircle2 size={16} aria-hidden="true" />,
    iconColor: '#16A34A',
    borderColor: '#16A34A',
  },
  error: {
    icon: <AlertCircle size={16} aria-hidden="true" />,
    iconColor: '#DC2626',
    borderColor: '#DC2626',
  },
  warning: {
    icon: <AlertTriangle size={16} aria-hidden="true" />,
    iconColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  info: {
    icon: <Info size={16} aria-hidden="true" />,
    iconColor: '#0A7AFF',
    borderColor: '#0A7AFF',
  },
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

// ─── Provider + Viewport ──────────────────────────────────────────────────────

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...options, id, open: true }])
  }, [])

  const dismiss = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: false } : t))
    )
  }

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => {
          const variant = t.variant ?? 'info'
          const config = variantConfig[variant]

          return (
            <ToastPrimitive.Root
              key={t.id}
              open={t.open}
              onOpenChange={(open) => {
                if (!open) dismiss(t.id)
              }}
              duration={t.duration ?? 5000}
              onAnimationEnd={() => {
                if (!t.open) remove(t.id)
              }}
              className={cn(
                'group relative flex items-start gap-3 w-[360px] max-w-[calc(100vw-2rem)]',
                'rounded-lg border-l-4 bg-white dark:bg-[#1F2937]',
                'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-2px_rgba(0,0,0,0.05)]',
                'px-4 py-3',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
                'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-80',
                'transition-all duration-200'
              )}
              style={{ borderLeftColor: config.borderColor }}
            >
              {/* Icon */}
              <span className="shrink-0 mt-0.5" style={{ color: config.iconColor }}>
                {config.icon}
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] leading-snug">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>

              {/* Close */}
              <ToastPrimitive.Close
                aria-label="Close notification"
                className="shrink-0 p-0.5 rounded text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
              >
                <X size={14} aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}

        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <Toaster>')
  return ctx
}
