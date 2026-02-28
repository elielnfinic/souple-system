'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { VehicleForm } from '@/components/fleet/VehicleForm'
import type { Vehicle } from '@/lib/types'
import Link from 'next/link'

export default function NewVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  function handleSuccess(vehicle: Vehicle) {
    router.push(`/${locale}/dashboard/fleet/${vehicle.id}`)
  }

  function handleCancel() {
    router.push(`/${locale}/dashboard/fleet`)
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/dashboard/fleet`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
          aria-label="Back to fleet"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Add Vehicle
          </h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            Register a new vehicle in your fleet
          </p>
        </div>
      </div>

      {/* ── Form card ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <VehicleForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}
