'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Plus, CalendarDays, Filter } from 'lucide-react'
import { tripsApi } from '@/lib/api/trips'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { Trip } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-CD', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const selectClass = cn(
  'h-9 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-sm text-[#111827] dark:text-[#F9FAFB]',
  'px-3 appearance-none pr-7',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
  'transition-colors duration-100'
)

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(locale: string): Column<Trip>[] {
  return [
    {
      key: 'departureAt',
      header: 'Départ',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-[#111827] dark:text-[#F9FAFB]">
          {formatDateTime(row.departureAt)}
        </span>
      ),
    },
    {
      key: 'stops',
      header: 'Itinéraire',
      render: (row) => {
        const sorted = [...(row.stops ?? [])].sort((a, b) => a.stopOrder - b.stopOrder)
        const from = sorted[0]?.city?.name ?? sorted[0]?.stopName ?? '—'
        const to = sorted[sorted.length - 1]?.city?.name ?? sorted[sorted.length - 1]?.stopName ?? '—'
        return (
          <div>
            <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{from}</span>
            <span className="mx-1.5 text-[#D1D5DB]">→</span>
            <span className="text-[#6B7280] dark:text-[#9CA3AF]">{to}</span>
            {sorted.length > 2 && (
              <span className="ml-1.5 text-[10px] text-[#9CA3AF] bg-[#F3F4F6] dark:bg-[#374151] px-1.5 py-0.5 rounded-full">
                +{sorted.length - 2} arrêt{sorted.length - 2 > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      render: (row) => (
        <span className="text-sm text-[#374151] dark:text-[#D1D5DB] font-mono">
          {row.vehicle?.plateNumber ?? `#${row.vehicleId}`}
        </span>
      ),
    },
    {
      key: 'totalSeats',
      header: 'Sièges',
      align: 'center',
      render: (row) => (
        <span className="tabular-nums text-sm text-[#374151] dark:text-[#D1D5DB]">
          {row.totalSeats}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      render: (row) => (
        <Link
          href={`/${locale}/dashboard/trips/${row.id}`}
          className="text-xs font-medium text-[#0A7AFF] hover:underline"
        >
          Détails
        </Link>
      ),
    },
  ]
}

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'scheduled', label: 'Planifié' },
  { value: 'boarding', label: 'Embarquement' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['trips', statusFilter, dateFrom, page],
    queryFn: () =>
      tripsApi.getTrips({
        status: (statusFilter as Trip['status']) || undefined,
        dateFrom: dateFrom || undefined,
        page,
        perPage: 20,
      }),
  })

  const trips = data?.data ?? []
  const total = data?.meta.total ?? 0
  const columns = buildColumns(locale)

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Trajets
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
            {total} trajet{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Link href={`/${locale}/dashboard/trips/new`}>
          <Button variant="primary" size="sm" leadingIcon={<Plus size={14} />}>
            Nouveau trajet
          </Button>
        </Link>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-[#9CA3AF]" />

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-[#9CA3AF]" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className={cn(selectClass, 'pr-3')}
          />
        </div>

        {(statusFilter || dateFrom) && (
          <button
            type="button"
            onClick={() => { setStatusFilter(''); setDateFrom(''); setPage(1) }}
            className="text-xs text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] underline"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <DataTable<Trip>
          columns={columns}
          data={trips}
          rowKey={(r) => r.id}
          loading={isLoading}
          emptyMessage="Aucun trajet trouvé. Créez votre premier trajet."
          totalRows={total}
          page={page}
          onPageChange={setPage}
          pageSize={20}
        />
      </div>
    </div>
  )
}
