'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, createColumnHelper } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trip {
  id: number
  routeName: string
  departureTime: string
  vehiclePlate: string
  status: string
  totalSeats: number
  bookedSeats: number
}

interface TripsResponse {
  success: true
  data: { items: Trip[]; meta: { total: number } }
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const col = createColumnHelper<Trip>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<Trip, any>[] = [
  col.accessor('routeName', {
    header: 'Route',
    cell: ({ getValue }) => (
      <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{getValue()}</span>
    ),
  }),
  col.accessor('departureTime', {
    header: 'Departure',
    cell: ({ getValue }) => (
      <span className="text-sm text-[#374151] dark:text-[#D1D5DB]">
        {new Date(getValue<string>()).toLocaleString()}
      </span>
    ),
  }),
  col.accessor('vehiclePlate', {
    header: 'Vehicle',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm">{getValue()}</span>
    ),
  }),
  col.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  col.accessor('totalSeats', {
    header: 'Seats',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.bookedSeats} / {row.original.totalSeats}
      </span>
    ),
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Link
        href={`trips/${row.original.id}`}
        className="text-xs text-[#0A7AFF] hover:underline"
      >
        View
      </Link>
    ),
  }),
]

// ─── Filters ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['', 'scheduled', 'boarding', 'departed', 'arrived', 'cancelled']

// ─── Component ────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<TripsResponse>('/trips', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
          },
        })
        setTrips(res.data.items)
      } catch {
        setTrips([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [search, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">Trips</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Manage all scheduled and past trips.
          </p>
        </div>
        <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />}>
          Create Trip
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            placeholder="Search route…"
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
            <option key={s} value={s}>{s === '' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={trips}
        isLoading={loading}
        emptyMessage="No trips found."
      />
    </div>
  )
}
