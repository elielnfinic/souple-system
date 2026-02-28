'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowRight, Clock, Users, Bus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Trip, TripStop } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TripCardProps {
  trip: Trip & {
    fromCity?: string
    toCity?: string
    availableSeats?: number
    lowestPrice?: number
    currency?: string
    stops?: TripStop[]
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-CD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDuration(departureAt: string, arrivalAt?: string): string {
  if (!arrivalAt) return ''
  const diffMs = new Date(arrivalAt).getTime() - new Date(departureAt).getTime()
  const totalMin = Math.round(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`
  if (h > 0) return `${h}h`
  return `${m}min`
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'CDF') {
    return `${amount.toLocaleString('fr-CD')} FC`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ─── Stop timeline strip ──────────────────────────────────────────────────────

function StopTimeline({ stops }: { stops?: TripStop[] }) {
  if (!stops || stops.length < 2) return null
  const sorted = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)
  const intermediates = sorted.slice(1, -1)

  return (
    <div className="flex items-center gap-0 mt-2 w-full max-w-xs">
      {/* First stop */}
      <div className="w-2.5 h-2.5 rounded-full bg-[#0A7AFF] shrink-0" aria-label={sorted[0]?.city?.name ?? 'Départ'} />
      <div className="flex-1 relative h-0.5 bg-[#E5E7EB] dark:bg-[#374151]">
        {intermediates.map((stop, i) => (
          <div
            key={stop.id}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#9CA3AF] border-2 border-white dark:border-[#1C1C1E]"
            style={{ left: `${((i + 1) / (intermediates.length + 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
            title={stop.city?.name ?? stop.stopName}
          />
        ))}
      </div>
      {/* Last stop */}
      <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0" aria-label={sorted[sorted.length - 1]?.city?.name ?? 'Arrivée'} />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TripCard({ trip }: TripCardProps) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  const stops = trip.stops ?? []
  const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)
  const firstStop = sortedStops[0]
  const lastStop = sortedStops[sortedStops.length - 1]
  const intermediateCount = Math.max(0, stops.length - 2)

  const fromName = trip.fromCity ?? firstStop?.city?.name ?? firstStop?.stopName ?? '—'
  const toName = trip.toCity ?? lastStop?.city?.name ?? lastStop?.stopName ?? '—'
  const depTime = formatTime(trip.departureAt)
  const arrTime = trip.estimatedArrivalAt ? formatTime(trip.estimatedArrivalAt) : null
  const duration = formatDuration(trip.departureAt, trip.estimatedArrivalAt)
  const availableSeats = trip.availableSeats ?? trip.totalSeats

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* ── Route info ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-center shrink-0">
              <div className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{depTime}</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5 truncate max-w-[90px]">{fromName}</div>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {duration && (
                <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
                  <Clock size={11} />
                  {duration}
                </div>
              )}
              <StopTimeline stops={stops} />
              {intermediateCount > 0 && (
                <div className="text-[10px] text-[#9CA3AF]">
                  {intermediateCount} arrêt{intermediateCount > 1 ? 's' : ''} intermédiaire{intermediateCount > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="text-center shrink-0">
              {arrTime && (
                <div className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{arrTime}</div>
              )}
              <div className="text-xs text-[#9CA3AF] mt-0.5 truncate max-w-[90px]">{toName}</div>
            </div>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div className="hidden sm:block w-px h-12 bg-[#E5E7EB] dark:bg-[#374151] shrink-0" />

        {/* ── Price + CTA ─────────────────────────────────────────────────── */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
          {trip.lowestPrice != null && (
            <div className="text-right">
              <div className="text-xs text-[#9CA3AF]">À partir de</div>
              <div className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">
                {formatPrice(trip.lowestPrice, trip.currency ?? 'CDF')}
              </div>
            </div>
          )}
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
              <Users size={12} />
              <span>{availableSeats} disponible{availableSeats !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={trip.status} />
              <Link href={`/${locale}/trips/${trip.id}/book`}>
                <Button
                  variant="primary"
                  size="sm"
                  trailingIcon={<ArrowRight size={14} />}
                  disabled={trip.status === 'cancelled' || trip.status === 'completed' || availableSeats === 0}
                >
                  Réserver
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ── Vehicle info strip ────────────────────────────────────────────── */}
      {trip.vehicle && (
        <div className="mt-3 pt-3 border-t border-[#F3F4F6] dark:border-[#2C2C2E] flex items-center gap-2 text-xs text-[#9CA3AF]">
          <Bus size={12} />
          <span>
            {trip.vehicle.brand} {trip.vehicle.model} — {trip.vehicle.plateNumber}
          </span>
          {trip.vehicle.features && trip.vehicle.features.length > 0 && (
            <>
              <span className="mx-1">·</span>
              <span>{trip.vehicle.features.slice(0, 3).join(', ')}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
