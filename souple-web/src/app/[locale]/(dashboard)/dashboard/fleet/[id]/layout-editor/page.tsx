'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { vehiclesApi } from '@/lib/api/vehicles'
import { SeatLayoutEditor } from '@/components/fleet/SeatLayoutEditor'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export default function LayoutEditorPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = (params?.locale as string) ?? 'fr'
  const vehicleId = Number(params?.id)
  const layoutIdParam = searchParams?.get('layoutId')
  const layoutId = layoutIdParam ? Number(layoutIdParam) : undefined

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehiclesApi.get(vehicleId),
    enabled: !isNaN(vehicleId),
  })

  const vehicle = data?.data

  function handleSaveSuccess() {
    router.push(`/${locale}/dashboard/fleet/${vehicleId}`)
  }

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
        <Skeleton className="h-[400px] w-full rounded-2xl" />
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
      <div className="flex items-start gap-4">
        <Link
          href={`/${locale}/dashboard/fleet/${vehicleId}`}
          className="mt-1 inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors shrink-0"
          aria-label="Back to vehicle"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Seat Layout Editor
          </h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            {vehicle.brand} {vehicle.model}
            {vehicle.plateNumber ? ` — ${vehicle.plateNumber}` : ''}
          </p>
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────────── */}
      <SeatLayoutEditor
        vehicleId={vehicleId}
        layoutId={layoutId}
        onSave={handleSaveSuccess}
      />
    </div>
  )
}
