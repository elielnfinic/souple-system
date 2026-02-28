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

interface Vehicle {
  id: number
  type: string
  brand: string
  model: string
  year: number
  color: string
  plateNumber: string
  totalSeats: number
  verificationStatus: 'pending' | 'verified' | 'rejected'
  status: string
  photoUrl: string | null
}

interface VehiclesResponse {
  success: true
  data: { items: Vehicle[]; meta: { total: number } }
}

// ─── Column definitions ───────────────────────────────────────────────────────

const col = createColumnHelper<Vehicle>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns = [
  col.display({
    id: 'photo',
    header: 'Photo',
    cell: ({ row }) =>
      row.original.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.original.photoUrl}
          alt={`${row.original.brand} ${row.original.model}`}
          className="w-10 h-10 rounded-md object-cover border border-[#E5E7EB]"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-[#F3F4F6] dark:bg-[#374151] flex items-center justify-center text-[#9CA3AF] text-xs font-medium">
          {row.original.brand.charAt(0)}
        </div>
      ),
  }),
  col.accessor((v) => `${v.brand} ${v.model}`, {
    id: 'brandModel',
    header: 'Brand / Model',
    cell: ({ row, getValue }) => (
      <div>
        <p className="font-medium text-[#111827] dark:text-[#F9FAFB]">{getValue()}</p>
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{row.original.year}</p>
      </div>
    ),
  }),
  col.accessor('type', {
    header: 'Type',
    cell: ({ getValue }) => (
      <span className="capitalize text-sm">{getValue()}</span>
    ),
  }),
  col.accessor('plateNumber', {
    header: 'Plate',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm tracking-wide">{getValue()}</span>
    ),
  }),
  col.accessor('verificationStatus', {
    header: 'Verification',
    cell: ({ getValue }) => {
      const status = getValue()
      const map: Record<string, string> = {
        pending: 'pending',
        verified: 'active',
        rejected: 'cancelled',
      }
      const labelMap: Record<string, string> = {
        pending: 'Pending',
        verified: 'Verified',
        rejected: 'Rejected',
      }
      return <StatusBadge status={map[status] ?? status} label={labelMap[status]} />
    },
  }),
  col.accessor('totalSeats', {
    header: 'Seats',
    cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={`vehicles/${row.original.id}`}
          className="text-xs text-[#0A7AFF] hover:underline font-medium"
        >
          View
        </Link>
      </div>
    ),
  }),
]

// ─── Filter bar ───────────────────────────────────────────────────────────────

const VEHICLE_TYPES = ['all', 'minibus', 'bus', 'sedan', 'van', 'pickup']
const VERIFICATION_STATUSES = ['all', 'pending', 'verified', 'rejected']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')

  useEffect(() => {
    const params: Record<string, string> = {}
    if (typeFilter !== 'all') params.type = typeFilter
    if (verificationFilter !== 'all') params.verificationStatus = verificationFilter
    if (search.trim()) params.search = search.trim()

    setIsLoading(true)
    api
      .get<VehiclesResponse>('/vehicles', { params })
      .then((res) => setVehicles(res.data.items))
      .catch(() => setVehicles([]))
      .finally(() => setIsLoading(false))
  }, [typeFilter, verificationFilter, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">Vehicles</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
            Manage your fleet of vehicles.
          </p>
        </div>
        <Link href="vehicles/new">
          <Button leadingIcon={<Plus size={16} />}>Add Vehicle</Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
          />
        </div>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-sm text-[#374151] dark:text-[#D1D5DB] px-3 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
          aria-label="Filter by type"
        >
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Verification status */}
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="h-9 rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-sm text-[#374151] dark:text-[#D1D5DB] px-3 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
          aria-label="Filter by verification status"
        >
          {VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns as ColumnDef<Vehicle, unknown>[]}
        data={vehicles}
        isLoading={isLoading}
        emptyMessage="No vehicles found. Add your first vehicle to get started."
      />
    </div>
  )
}
