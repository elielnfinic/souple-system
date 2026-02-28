'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Pencil, Trash2, LayoutGrid, Star,
  CheckCircle2, XCircle, Image as ImageIcon,
} from 'lucide-react'
import { vehiclesApi, seatLayoutsApi } from '@/lib/api/vehicles'
import type { Vehicle, SeatLayout } from '@/lib/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">{value}</span>
    </div>
  )
}

// ─── Delete dialog ────────────────────────────────────────────────────────────

function DeleteDialog({
  vehicleName,
  onConfirm,
  onCancel,
  loading,
}: {
  vehicleName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-xl p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#FEE2E2] dark:bg-[#450A0A] flex items-center justify-center">
            <Trash2 size={18} className="text-[#DC2626]" />
          </div>
          <div className="flex-1">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Delete vehicle
            </h2>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Are you sure you want to delete <strong>{vehicleName}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            Delete vehicle
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Verify dialog ────────────────────────────────────────────────────────────

function VerifyDialog({
  action,
  vehicleName,
  onConfirm,
  onCancel,
  loading,
}: {
  action: 'verified' | 'rejected'
  vehicleName: string
  onConfirm: (note?: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [note, setNote] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-xl p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            action === 'verified' ? 'bg-[#DCFCE7] dark:bg-[#14532D]' : 'bg-[#FEE2E2] dark:bg-[#450A0A]'
          )}>
            {action === 'verified'
              ? <CheckCircle2 size={18} className="text-[#16A34A]" />
              : <XCircle size={18} className="text-[#DC2626]" />}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {action === 'verified' ? 'Verify vehicle' : 'Reject vehicle'}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              {action === 'verified'
                ? `Approve ${vehicleName} for operation?`
                : `Reject ${vehicleName}?`}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note…"
              rows={2}
              className={cn(
                'mt-3 w-full px-3 py-2 text-sm rounded-lg border resize-none',
                'border-[#D1D5DB] dark:border-[#4B5563]',
                'bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF]',
                'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
              )}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button
            variant={action === 'verified' ? 'success' : 'danger'}
            size="sm"
            onClick={() => onConfirm(note || undefined)}
            loading={loading}
          >
            {action === 'verified' ? 'Verify' : 'Reject'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const vehicleId = Number(params?.id)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [showDelete, setShowDelete] = useState(false)
  const [verifyAction, setVerifyAction] = useState<'verified' | 'rejected' | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehiclesApi.get(vehicleId),
    enabled: !isNaN(vehicleId),
  })

  const { data: layoutsData, isLoading: layoutsLoading } = useQuery({
    queryKey: ['seat-layouts', vehicleId],
    queryFn: () => seatLayoutsApi.list(vehicleId),
    enabled: !isNaN(vehicleId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => vehiclesApi.delete(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      router.push(`/${locale}/dashboard/fleet`)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (payload: { status: 'verified' | 'rejected'; note?: string }) =>
      vehiclesApi.verify(vehicleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setVerifyAction(null)
    },
  })

  const vehicle = data?.data
  const layouts = layoutsData?.data ?? []

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-4">
          <Skeleton className="h-6 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-[#6B7280] dark:text-[#9CA3AF]">Vehicle not found.</p>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/${locale}/dashboard/fleet`)}>
          Back to Fleet
        </Button>
      </div>
    )
  }

  const verificationStatusMap: Record<Vehicle['verificationStatus'], string> = {
    pending: 'pending',
    verified: 'active',
    rejected: 'cancelled',
  }
  const verificationLabelMap: Record<Vehicle['verificationStatus'], string> = {
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Rejected',
  }

  const vehicleName = `${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}`

  return (
    <div className="space-y-6">
      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      {showDelete && (
        <DeleteDialog
          vehicleName={vehicleName}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDelete(false)}
          loading={deleteMutation.isPending}
        />
      )}
      {verifyAction && (
        <VerifyDialog
          action={verifyAction}
          vehicleName={vehicleName}
          onConfirm={(note) => verifyMutation.mutate({ status: verifyAction, note })}
          onCancel={() => setVerifyAction(null)}
          loading={verifyMutation.isPending}
        />
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href={`/${locale}/dashboard/fleet`}
            className="mt-1 inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors shrink-0"
            aria-label="Back to fleet"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
                {vehicle.brand} {vehicle.model}
              </h1>
              <span className="font-mono text-sm bg-[#F3F4F6] dark:bg-[#1F2937] text-[#374151] dark:text-[#D1D5DB] px-2 py-0.5 rounded">
                {vehicle.plateNumber}
              </span>
              <StatusBadge
                status={verificationStatusMap[vehicle.verificationStatus]}
                label={verificationLabelMap[vehicle.verificationStatus]}
              />
            </div>
            {vehicle.year && (
              <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">{vehicle.year}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          {/* Super admin verify/reject buttons */}
          {user?.isSuperAdmin && vehicle.verificationStatus === 'pending' && (
            <>
              <Button
                variant="success"
                size="sm"
                leadingIcon={<CheckCircle2 size={14} />}
                onClick={() => setVerifyAction('verified')}
              >
                Verify
              </Button>
              <Button
                variant="danger"
                size="sm"
                leadingIcon={<XCircle size={14} />}
                onClick={() => setVerifyAction('rejected')}
              >
                Reject
              </Button>
            </>
          )}
          <Link href={`/${locale}/dashboard/fleet/${vehicle.id}/edit`}>
            <Button variant="secondary" size="sm" leadingIcon={<Pencil size={14} />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            leadingIcon={<Trash2 size={14} />}
            onClick={() => setShowDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* ── Info grid ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mb-5">
          Vehicle information
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
          <InfoRow label="Type" value={<span className="capitalize">{vehicle.type}</span>} />
          <InfoRow label="Color" value={vehicle.color} />
          <InfoRow label="Total seats" value={vehicle.totalSeats} />
          <InfoRow
            label="Visibility"
            value={
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                vehicle.visibility === 'public'
                  ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#1D4ED8] dark:text-[#60A5FA]'
                  : 'bg-[#F9FAFB] dark:bg-[#1F2937] text-[#4B5563] dark:text-[#9CA3AF]'
              )}>
                {vehicle.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            }
          />
          <InfoRow
            label="Available for rental"
            value={vehicle.isAvailableForRental ? 'Yes' : 'No'}
          />
          <InfoRow
            label="Rating"
            value={
              <span className="flex items-center gap-1">
                <Star size={13} className="text-[#F59E0B] fill-[#F59E0B]" />
                {vehicle.rating?.toFixed(1) ?? '—'}
              </span>
            }
          />
          <InfoRow label="Total trips" value={vehicle.totalTrips ?? 0} />
          {vehicle.features && vehicle.features.length > 0 && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wide">
                Features
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {vehicle.features.map((f) => (
                  <span
                    key={f}
                    className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F0FDF4] dark:bg-[#14532D] text-[#16A34A] dark:text-[#4ADE80]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Photos ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Photos</h2>
        </div>
        {vehicle.photos && vehicle.photos.length > 0 ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {vehicle.photos.map((photo, i) => (
              <div
                key={i}
                className={cn(
                  'aspect-video rounded-xl overflow-hidden bg-[#F3F4F6] dark:bg-[#1F2937] relative',
                  photo.is_primary && 'ring-2 ring-[#0A7AFF]'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Vehicle photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {photo.is_primary && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#0A7AFF] text-white px-1.5 py-0.5 rounded-full">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#9CA3AF] dark:text-[#6B7280]">
            <ImageIcon size={28} />
            <p className="text-sm">No photos uploaded</p>
          </div>
        )}
      </div>

      {/* ── Seat layouts ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Seat Layouts</h2>
          <Link href={`/${locale}/dashboard/fleet/${vehicle.id}/layout-editor`}>
            <Button variant="secondary" size="sm" leadingIcon={<LayoutGrid size={13} />}>
              New Layout
            </Button>
          </Link>
        </div>

        {layoutsLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#F3F4F6] dark:border-[#2C2C2E]">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#9CA3AF] dark:text-[#6B7280]">
            <LayoutGrid size={28} />
            <p className="text-sm">No seat layouts configured</p>
            <Link href={`/${locale}/dashboard/fleet/${vehicle.id}/layout-editor`}>
              <Button variant="secondary" size="sm">Create first layout</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#F3F4F6] dark:divide-[#2C2C2E]">
            {layouts.map((layout: SeatLayout) => (
              <li key={layout.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937] transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
                      {layout.name}
                    </span>
                    {layout.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#0A7AFF]/15 text-[#0A7AFF]">
                        Default
                      </span>
                    )}
                    {!layout.isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#F9FAFB] dark:bg-[#1F2937] text-[#9CA3AF]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                    {layout.rows} rows × {layout.columns} columns
                  </p>
                </div>
                <Link href={`/${locale}/dashboard/fleet/${vehicle.id}/layout-editor?layoutId=${layout.id}`}>
                  <Button variant="ghost" size="sm" leadingIcon={<Pencil size={12} />}>
                    Edit Layout
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
