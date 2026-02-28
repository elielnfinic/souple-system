'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { DataTable, createColumnHelper } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: number
  reference: string
  passengerName: string
  routeName: string
  status: string
  amountCdf: number
  createdAt: string
}

interface BookingsResponse {
  success: true
  data: { items: Booking[]; meta: { total: number } }
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const col = createColumnHelper<Booking>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<Booking, any>[] = [
  col.accessor('reference', {
    header: 'Reference',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
        {getValue()}
      </span>
    ),
  }),
  col.accessor('passengerName', {
    header: 'Passenger',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue()}</span>
    ),
  }),
  col.accessor('routeName', {
    header: 'Trip / Route',
    cell: ({ getValue }) => (
      <span className="text-sm text-[#374151] dark:text-[#D1D5DB]">{getValue()}</span>
    ),
  }),
  col.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  col.accessor('amountCdf', {
    header: 'Amount',
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums">{formatCurrency(getValue<number>(), 'CDF')}</span>
    ),
  }),
  col.accessor('createdAt', {
    header: 'Date',
    cell: ({ getValue }) => (
      <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
        {new Date(getValue<string>()).toLocaleDateString()}
      </span>
    ),
  }),
]

// ─── Filters ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'checked_in', 'cancelled', 'refunded']

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<BookingsResponse>('/bookings', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
          },
        })
        setBookings(res.data.items)
      } catch {
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [search, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">Bookings</h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
          View and manage all passenger bookings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            placeholder="Search passenger or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 h-9 text-sm rounded-lg border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#1F2937] text-[#374151] dark:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={bookings}
        isLoading={loading}
        emptyMessage="No bookings found."
      />
    </div>
  )
}
