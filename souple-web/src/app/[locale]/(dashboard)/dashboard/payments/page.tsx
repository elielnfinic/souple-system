'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { paymentsApi } from '@/lib/api/payments'
import type { Payment } from '@/lib/types'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'
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

const PAYMENT_STATUS_MAP: Record<Payment['status'], string> = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
  partially_refunded: 'refunded',
}

const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
  partially_refunded: 'Partiellement remboursé',
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  card: 'Carte',
  stripe: 'Stripe',
  cash: 'Espèces',
  stablecoin: 'Crypto',
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn: 'MTN MoMo',
  orange: 'Orange Money',
  airtel: 'Airtel Money',
  stripe: 'Stripe',
  cash: 'Cash',
  crypto: 'Stablecoin',
}

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(locale: string): Column<Payment>[] {
  return [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] tabular-nums whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString('fr-CD', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'bookingId',
      header: 'Réservation',
      render: (row) =>
        row.bookingId ? (
          <Link
            href={`/${locale}/dashboard/bookings/${row.bookingId}`}
            className="text-sm font-mono text-[#0A7AFF] hover:underline"
          >
            #{row.bookingId}
          </Link>
        ) : (
          <span className="text-sm text-[#9CA3AF]">—</span>
        ),
    },
    {
      key: 'method',
      header: 'Méthode',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
            {METHOD_LABELS[row.method] ?? row.method}
          </span>
          {row.provider && (
            <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              {PROVIDER_LABELS[row.provider] ?? row.provider}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-semibold tabular-nums text-[#111827] dark:text-[#F9FAFB]">
          {formatCurrency(row.amount, row.currency as SupportedCurrency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      align: 'center',
      render: (row) => (
        <StatusBadge
          status={PAYMENT_STATUS_MAP[row.status] ?? row.status}
          label={PAYMENT_STATUS_LABELS[row.status] ?? row.status}
        />
      ),
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      render: (row) => (
        <Link
          href={`/${locale}/dashboard/payments/${row.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0A7AFF] hover:bg-[#EFF6FF] dark:hover:bg-[#0A7AFF]/10 transition-colors"
        >
          <Eye size={12} />
          Voir
        </Link>
      ),
    },
  ]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['payments', methodFilter, statusFilter, dateFrom, dateTo],
    queryFn: () =>
      paymentsApi.list({
        method: (methodFilter as Payment['method']) || undefined,
        status: (statusFilter as Payment['status']) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        perPage: 50,
      }),
  })

  const payments = data?.data ?? []
  const total = data?.meta.total ?? 0

  const columns = buildColumns(locale)
  const hasFilters = !!(methodFilter || statusFilter || dateFrom || dateTo)

  function clearFilters() {
    setMethodFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Paiements
          </h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            {isLoading ? '—' : `${total} paiement${total !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Method */}
        <div className="relative">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={selectClass}
            aria-label="Filtrer par méthode"
          >
            <option value="">Toutes méthodes</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="card">Carte</option>
            <option value="cash">Espèces</option>
            <option value="stablecoin">Crypto</option>
          </select>
          <ChevronDown />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="processing">En cours</option>
            <option value="completed">Payé</option>
            <option value="failed">Échoué</option>
            <option value="refunded">Remboursé</option>
          </select>
          <ChevronDown />
        </div>

        {/* Date from */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={cn(inputClass, 'w-36')}
          aria-label="Filtrer depuis"
        />

        {/* Date to */}
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={cn(inputClass, 'w-36')}
          aria-label="Filtrer jusqu'à"
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

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {!isLoading && payments.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
            title={hasFilters ? 'Aucun paiement ne correspond aux filtres' : 'Aucun paiement'}
            description={
              hasFilters
                ? 'Essayez de modifier vos filtres.'
                : 'Les paiements apparaîtront ici une fois effectués.'
            }
            action={
              hasFilters
                ? { label: 'Effacer les filtres', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          <div className="p-4">
            <DataTable<Payment>
              columns={columns}
              data={payments}
              rowKey={(r) => r.id}
              loading={isLoading}
              emptyMessage="Aucun paiement trouvé."
              pageSize={20}
            />
          </div>
        )}
      </div>
    </div>
  )
}
