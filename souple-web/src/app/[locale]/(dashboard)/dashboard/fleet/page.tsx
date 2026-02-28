'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, Truck, Pencil, Eye } from 'lucide-react'
import { vehiclesApi } from '@/lib/api/vehicles'
import type { Vehicle } from '@/lib/types'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useParams } from 'next/navigation'

// ─── Filter bar ───────────────────────────────────────────────────────────────

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

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(locale: string): Column<Vehicle>[] {
  return [
    {
      key: 'brand',
      header: 'Vehicle',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
            {row.brand} {row.model}
          </span>
          {row.year && (
            <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{row.year}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="capitalize text-[#6B7280] dark:text-[#8E8E93] text-sm">{row.type}</span>
      ),
    },
    {
      key: 'plateNumber',
      header: 'Plate',
      render: (row) => (
        <span className="font-mono text-sm text-[#374151] dark:text-[#D1D5DB] bg-[#F3F4F6] dark:bg-[#1F2937] px-2 py-0.5 rounded">
          {row.plateNumber}
        </span>
      ),
    },
    {
      key: 'totalSeats',
      header: 'Seats',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums text-sm text-[#6B7280] dark:text-[#8E8E93]">
          {row.totalSeats}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Status',
      align: 'center',
      render: (row) => {
        const statusMap: Record<Vehicle['verificationStatus'], string> = {
          pending: 'pending',
          verified: 'active',
          rejected: 'cancelled',
        }
        const labelMap: Record<Vehicle['verificationStatus'], string> = {
          pending: 'Pending',
          verified: 'Verified',
          rejected: 'Rejected',
        }
        return (
          <StatusBadge
            status={statusMap[row.verificationStatus]}
            label={labelMap[row.verificationStatus]}
          />
        )
      },
    },
    {
      key: 'visibility',
      header: 'Visibility',
      align: 'center',
      render: (row) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            row.visibility === 'public'
              ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#1D4ED8] dark:text-[#60A5FA]'
              : 'bg-[#F9FAFB] dark:bg-[#1F2937] text-[#4B5563] dark:text-[#9CA3AF]'
          )}
        >
          {row.visibility === 'public' ? 'Public' : 'Private'}
        </span>
      ),
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/${locale}/dashboard/fleet/${row.id}/edit`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
          >
            <Pencil size={12} />
            Edit
          </Link>
          <Link
            href={`/${locale}/dashboard/fleet/${row.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0A7AFF] hover:bg-[#EFF6FF] dark:hover:bg-[#0A7AFF]/10 transition-colors"
          >
            <Eye size={12} />
            View
          </Link>
        </div>
      ),
    },
  ]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FleetPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', typeFilter, statusFilter, visibilityFilter, search],
    queryFn: () =>
      vehiclesApi.list({
        type: typeFilter || undefined,
        verificationStatus: statusFilter || undefined,
        visibility: visibilityFilter || undefined,
        search: search || undefined,
        perPage: 50,
      }),
  })

  const vehicles = data?.data ?? []
  const total = data?.meta.total ?? 0

  const columns = buildColumns(locale)

  const hasFilters = !!(typeFilter || statusFilter || visibilityFilter || search)

  function clearFilters() {
    setTypeFilter('')
    setStatusFilter('')
    setVisibilityFilter('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Fleet
          </h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            {isLoading ? '—' : `${total} vehicle${total !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leadingIcon={<Plus size={14} />}
          onClick={() => router.push(`/${locale}/dashboard/fleet/new`)}
        >
          Add Vehicle
        </Button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="bus">Bus</option>
            <option value="minibus">Minibus</option>
            <option value="van">Van</option>
            <option value="sedan">Sedan</option>
            <option value="pickup">Pickup</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {/* Verification status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {/* Visibility */}
        <div className="relative">
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by visibility"
          >
            <option value="">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand, model, plate…"
          className={cn(inputClass, 'w-56')}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {!isLoading && vehicles.length === 0 ? (
          <EmptyState
            icon={<Truck size={32} />}
            title={hasFilters ? 'No vehicles match your filters' : 'No vehicles registered'}
            description={
              hasFilters
                ? 'Try adjusting your filters or search terms.'
                : 'Add your first vehicle to start managing your fleet.'
            }
            action={
              hasFilters
                ? { label: 'Clear filters', onClick: clearFilters }
                : { label: 'Add Vehicle', onClick: () => router.push(`/${locale}/dashboard/fleet/new`) }
            }
          />
        ) : (
          <div className="p-4">
            <DataTable<Vehicle>
              columns={columns}
              data={vehicles}
              rowKey={(r) => r.id}
              loading={isLoading}
              emptyMessage="No vehicles found."
              pageSize={20}
            />
          </div>
        )}
      </div>
    </div>
  )
}
