'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { vehiclesApi } from '@/lib/api/vehicles'
import type { Vehicle } from '@/lib/types'
import { VehicleForm } from '@/components/fleet/VehicleForm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export default function EditVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const vehicleId = Number(params?.id)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehiclesApi.get(vehicleId),
    enabled: !isNaN(vehicleId),
  })

  const vehicle = data?.data

  function handleSuccess(updated: Vehicle) {
    router.push(`/${locale}/dashboard/fleet/${updated.id}`)
  }

  function handleCancel() {
    router.push(`/${locale}/dashboard/fleet/${vehicleId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
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

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/dashboard/fleet/${vehicleId}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
          aria-label="Back to vehicle"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Edit Vehicle
          </h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            {vehicle.brand} {vehicle.model}
            {vehicle.year ? ` — ${vehicle.year}` : ''}
          </p>
        </div>
      </div>

      {/* ── Form card ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <VehicleForm vehicle={vehicle} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}
