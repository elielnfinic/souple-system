'use client'

import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { notificationsApi } from '@/lib/api/notifications'
import type { Notification } from '@/lib/types'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const selectClass = cn(
  'h-9 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-sm text-[#374151] dark:text-[#D1D5DB]',
  'px-3 pr-8 appearance-none',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
)

const inputClass = cn(
  'h-9 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-sm text-[#374151] dark:text-[#D1D5DB] placeholder:text-[#9CA3AF]',
  'px-3',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
)

function ChevronDown() {
  return (
    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'booking_confirmed', label: 'Réservation confirmée' },
  { value: 'payment_receipt', label: 'Reçu de paiement' },
  { value: 'trip_departure_reminder', label: 'Rappel de départ' },
  { value: 'trip_cancelled', label: 'Trajet annulé' },
  { value: 'trip_started', label: 'Trajet démarré' },
  { value: 'trip_completed', label: 'Trajet terminé' },
  { value: 'welcome', label: 'Bienvenue' },
  { value: 'kyc_approved', label: 'KYC approuvé' },
  { value: 'kyc_rejected', label: 'KYC rejeté' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'unread', label: 'Non lu' },
  { value: 'read', label: 'Lu' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const PER_PAGE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', typeFilter, statusFilter, dateFrom, dateTo, page],
    queryFn: () =>
      notificationsApi.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        perPage: PER_PAGE,
      }),
  })

  const notifications = data?.data ?? []
  const total = data?.meta.total ?? 0
  const lastPage = data?.meta.lastPage ?? 1

  const hasFilters = !!(typeFilter || statusFilter || dateFrom || dateTo)

  function clearFilters() {
    setTypeFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  // Mark single read
  const handleRead = useCallback(async (id: number) => {
    try {
      await notificationsApi.markRead(id)
      queryClient.setQueryData(
        ['notifications', typeFilter, statusFilter, dateFrom, dateTo, page],
        (old: typeof data) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((n: Notification) =>
              n.id === id ? { ...n, readAt: new Date().toISOString() } : n
            ),
          }
        }
      )
    } catch {
      // silent
    }
  }, [queryClient, typeFilter, statusFilter, dateFrom, dateTo, page])

  // Mark all read
  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const hasUnread = notifications.some((n) => !n.readAt)

  // ── Loading skeletons ────────────────────────────────────────────────────────

  function NotificationSkeleton() {
    return (
      <div className="flex items-start gap-3 px-4 py-3 border-b border-[#F3F4F6] dark:border-[#2C2C2E] last:border-0">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            {isLoading ? '—' : `${total} notification${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        {hasUnread && (
          <Button
            variant="secondary"
            size="sm"
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className={selectClass}
            aria-label="Filtrer par type"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className={selectClass}
            aria-label="Filtrer par statut"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown />
        </div>

        {/* Date from */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className={cn(inputClass, 'w-36')}
          aria-label="Depuis"
        />

        {/* Date to */}
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className={cn(inputClass, 'w-36')}
          aria-label="Jusqu'à"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {isLoading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            title={hasFilters ? 'Aucune notification ne correspond aux filtres' : 'Aucune notification'}
            description={
              hasFilters
                ? 'Essayez de modifier vos filtres.'
                : 'Vos notifications apparaîtront ici.'
            }
            action={
              hasFilters
                ? { label: 'Effacer les filtres', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          <div className="divide-y divide-[#F3F4F6] dark:divide-[#2C2C2E]">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={handleRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          <span>
            {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} sur {total}
          </span>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors duration-100',
                'text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]',
                page === 1 && 'opacity-40 cursor-not-allowed pointer-events-none'
              )}
              aria-label="Page précédente"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <span className="px-2 text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
              {page} / {lastPage}
            </span>

            <button
              onClick={() => setPage(Math.min(lastPage, page + 1))}
              disabled={page === lastPage}
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors duration-100',
                'text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]',
                page === lastPage && 'opacity-40 cursor-not-allowed pointer-events-none'
              )}
              aria-label="Page suivante"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
