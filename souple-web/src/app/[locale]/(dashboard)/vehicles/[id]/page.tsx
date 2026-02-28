'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeatLayout {
  id: number
  name: string
  rows: number
  seatsPerRow: number
  totalSeats: number
}

interface VehicleDetail {
  id: number
  type: string
  brand: string
  model: string
  year: number
  color: string | null
  plateNumber: string
  totalSeats: number
  verificationStatus: 'pending' | 'verified' | 'rejected'
  status: string
  visibility: 'public' | 'private'
  availableForRental: boolean
  photoUrl: string | null
  seatLayouts?: SeatLayout[]
}

interface VehicleResponse {
  success: true
  data: VehicleDetail
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    api
      .get<VehicleResponse>(`/vehicles/${id}`)
      .then((res) => setVehicle(res.data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load vehicle')
      })
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleDelete() {
    if (!vehicle) return
    if (!confirm(`Delete vehicle ${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})?`)) return

    setIsDeleting(true)
    try {
      await api.delete(`/vehicles/${id}`)
      router.push('../../vehicles')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete vehicle')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-4">
        <Link href="../../vehicles">
          <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft size={16} />}>
            Back
          </Button>
        </Link>
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] p-8 text-center">
          <p className="text-sm text-[#DC2626]">{error ?? 'Vehicle not found'}</p>
        </div>
      </div>
    )
  }

  const verificationStatusMap: Record<string, string> = {
    pending: 'pending',
    verified: 'active',
    rejected: 'cancelled',
  }
  const verificationLabelMap: Record<string, string> = {
    pending: 'Pending Review',
    verified: 'Verified',
    rejected: 'Rejected',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="../../vehicles">
            <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft size={16} />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 font-mono">
              {vehicle.plateNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`../../vehicles/${id}/edit`}>
            <Button variant="secondary" size="sm" leadingIcon={<Pencil size={14} />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            leadingIcon={<Trash2 size={14} />}
            loading={isDeleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Vehicle Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
          <StatusBadge
            status={verificationStatusMap[vehicle.verificationStatus] ?? vehicle.verificationStatus}
            label={verificationLabelMap[vehicle.verificationStatus]}
          />
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <DetailRow label="Type" value={vehicle.type} capitalize />
            <DetailRow label="Brand" value={vehicle.brand} />
            <DetailRow label="Model" value={vehicle.model} />
            <DetailRow label="Year" value={String(vehicle.year)} />
            {vehicle.color && <DetailRow label="Color" value={vehicle.color} />}
            <DetailRow label="Total Seats" value={String(vehicle.totalSeats)} />
            <DetailRow label="Visibility" value={vehicle.visibility} capitalize />
            <DetailRow
              label="Available for Rental"
              value={vehicle.availableForRental ? 'Yes' : 'No'}
            />
            <DetailRow label="Status" value={vehicle.status} capitalize />
          </dl>
        </CardContent>
      </Card>

      {/* Seat Layouts Card */}
      <Card>
        <CardHeader>
          <CardTitle>Seat Layouts</CardTitle>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => alert('Add layout — coming soon')}
          >
            Add Layout
          </Button>
        </CardHeader>
        <CardContent>
          {!vehicle.seatLayouts || vehicle.seatLayouts.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280] text-center py-6">
              No seat layouts defined yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
              {vehicle.seatLayouts.map((layout) => (
                <li key={layout.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
                      {layout.name}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {layout.rows} rows × {layout.seatsPerRow} seats = {layout.totalSeats} total
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" leadingIcon={<Pencil size={14} />}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm text-[#111827] dark:text-[#F9FAFB] font-medium ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
