'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft, Clock, Users, RefreshCw } from 'lucide-react'
import { tripsApi, bookingsApi } from '@/lib/api/trips'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable, type Column } from '@/components/ui/data-table'
import { TripManifest } from '@/components/trips/TripManifest'
import { cn } from '@/lib/utils'
import type { Trip, TripStop, Booking } from '@/lib/types'
import type { TripManifestEntry } from '@/lib/api/trips'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-CD', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'CDF') return `${amount.toLocaleString('fr-CD')} FC`
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ─── Trip status options ──────────────────────────────────────────────────────

const TRIP_STATUSES: Array<{ value: Trip['status']; label: string }> = [
  { value: 'scheduled', label: 'Planifié' },
  { value: 'boarding', label: 'Embarquement' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

// ─── Booking columns ──────────────────────────────────────────────────────────

const bookingColumns: Column<Booking>[] = [
  {
    key: 'bookingCode',
    header: 'Code',
    render: (row) => (
      <span className="font-mono text-xs font-semibold text-[#374151] dark:text-[#D1D5DB]">
        {row.bookingCode}
      </span>
    ),
  },
  {
    key: 'passengerName',
    header: 'Passager',
    render: (row) => (
      <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{row.passengerName}</span>
    ),
  },
  {
    key: 'boardingStopOrder',
    header: 'Arrêts',
    render: (row) => (
      <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
        {row.boardingStop?.city?.name ?? `#${row.boardingStopOrder}`}
        {' → '}
        {row.alightingStop?.city?.name ?? `#${row.alightingStopOrder}`}
      </span>
    ),
  },
  {
    key: 'totalAmount',
    header: 'Montant',
    align: 'right',
    render: (row) => (
      <span className="tabular-nums text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
        {formatPrice(row.totalAmount, row.currency)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Statut',
    render: (row) => <StatusBadge status={row.status} />,
  },
]

// ─── Load chart ───────────────────────────────────────────────────────────────

interface LoadChartProps {
  stops: TripStop[]
  bookings: Booking[]
  totalSeats: number
}

function LoadChart({ stops, bookings, totalSeats }: LoadChartProps) {
  const sorted = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)

  // For each stop, count passengers on board (those who boarded <= this stop AND alight >= this stop)
  const occupancy = sorted.map((stop) => {
    const onBoard = bookings.filter(
      (b) =>
        b.boardingStopOrder <= stop.stopOrder &&
        b.alightingStopOrder > stop.stopOrder &&
        b.status !== 'cancelled'
    )
    const count = onBoard.reduce((sum, b) => sum + b.seatCount, 0)
    return {
      stopName: stop.city?.name ?? stop.stopName ?? `Arrêt ${stop.stopOrder + 1}`,
      count,
      pct: totalSeats > 0 ? Math.round((count / totalSeats) * 100) : 0,
    }
  })

  return (
    <div className="space-y-2">
      {occupancy.map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate shrink-0 text-right">
            {row.stopName}
          </span>
          <div className="flex-1 h-5 bg-[#F3F4F6] dark:bg-[#374151] rounded-md overflow-hidden">
            <div
              className="h-full rounded-md transition-all duration-300"
              style={{
                width: `${row.pct}%`,
                backgroundColor: row.pct >= 90 ? '#DC2626' : row.pct >= 60 ? '#F59E0B' : '#0A7AFF',
              }}
            />
          </div>
          <span className="w-10 text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums shrink-0">
            {row.count}/{totalSeats}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Stops timeline edit ─────────────────────────────────────────────────────

interface StopsTimelineProps {
  stops: TripStop[]
  tripId: number
}

function StopsTimeline({ stops, tripId }: StopsTimelineProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [timeInput, setTimeInput] = useState('')

  const updateMutation = useMutation({
    mutationFn: ({ stopId, time }: { stopId: number; time: string }) =>
      tripsApi.updateStopActualTime(tripId, stopId, { actualArrivalAt: time }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-stops', tripId] })
      setEditingId(null)
    },
  })

  const sorted = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)

  return (
    <div className="space-y-3">
      {sorted.map((stop, idx) => {
        const stopName = stop.city?.name ?? stop.stopName ?? `Arrêt ${stop.stopOrder + 1}`
        const isFirst = idx === 0
        const isLast = idx === sorted.length - 1
        const isEditing = editingId === stop.id

        return (
          <div key={stop.id} className="flex gap-3">
            {/* Dot + line */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                'w-3 h-3 rounded-full border-2 mt-1.5',
                isFirst || isLast ? 'bg-[#0A7AFF] border-[#0A7AFF]' : 'bg-white dark:bg-[#1C1C1E] border-[#9CA3AF]'
              )} />
              {!isLast && <div className="w-0.5 flex-1 bg-[#E5E7EB] dark:bg-[#374151] mt-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-[#111827] dark:text-[#F9FAFB]">{stopName}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[#9CA3AF]">
                    {stop.scheduledDepartureAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Planifié: {formatDateTime(stop.scheduledDepartureAt)}
                      </span>
                    )}
                    {stop.actualArrivalAt && (
                      <span className="flex items-center gap-1 text-[#16A34A]">
                        Réel: {formatDateTime(stop.actualArrivalAt)}
                      </span>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      className="h-8 text-xs rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] px-2 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      loading={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ stopId: stop.id, time: timeInput })}
                    >
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(stop.id)
                      setTimeInput(stop.actualArrivalAt?.slice(0, 16) ?? '')
                    }}
                    className="text-xs text-[#0A7AFF] hover:underline"
                  >
                    Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const tripId = Number(params?.id)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'stops' | 'manifest' | 'bookings' | 'load'>('stops')
  const [selectedManifestStop, setSelectedManifestStop] = useState<number | undefined>()

  const { data: tripRes, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTrip(tripId),
    enabled: !!tripId,
  })

  const { data: stopsRes } = useQuery({
    queryKey: ['trip-stops', tripId],
    queryFn: () => tripsApi.getTripStops(tripId),
    enabled: !!tripId,
  })

  const { data: bookingsRes } = useQuery({
    queryKey: ['trip-bookings', tripId],
    queryFn: () => bookingsApi.getBookings({ tripId, perPage: 200 }),
    enabled: !!tripId,
  })

  const { data: manifestRes } = useQuery({
    queryKey: ['trip-manifest', tripId],
    queryFn: () => tripsApi.getTripManifest(tripId),
    enabled: !!tripId && activeTab === 'manifest',
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: Trip['status']) => tripsApi.updateTrip(tripId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  })

  const trip = tripRes?.data
  const stops = stopsRes?.data ?? []
  const bookings = bookingsRes?.data ?? []
  const manifest: TripManifestEntry[] = manifestRes?.data ?? []

  const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)
  const fromName = sortedStops[0]?.city?.name ?? sortedStops[0]?.stopName ?? '—'
  const toName = sortedStops[sortedStops.length - 1]?.city?.name ?? '—'

  const tabs = [
    { key: 'stops', label: 'Arrêts' },
    { key: 'manifest', label: 'Manifeste' },
    { key: 'bookings', label: `Réservations (${bookings.length})` },
    { key: 'load', label: 'Taux de remplissage' },
  ] as const

  if (tripLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[#E5E7EB] dark:bg-[#374151] rounded animate-pulse" />
        <div className="h-32 bg-[#E5E7EB] dark:bg-[#374151] rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="text-center py-12 text-[#9CA3AF]">
        Trajet introuvable.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link
        href={`/${locale}/dashboard/trips`}
        className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB]"
      >
        <ChevronLeft size={14} />
        Retour aux trajets
      </Link>

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={trip.status} />
              <span className="text-xs text-[#9CA3AF]">#{trip.id}</span>
            </div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              {fromName} → {toName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatDateTime(trip.departureAt)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={13} />
                {bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.seatCount, 0)}
                /{trip.totalSeats} sièges
              </span>
              {trip.vehicle && (
                <span className="font-mono text-xs bg-[#F3F4F6] dark:bg-[#374151] px-2 py-0.5 rounded-md">
                  {trip.vehicle.plateNumber}
                </span>
              )}
            </div>
          </div>

          {/* Status update */}
          <div className="flex items-center gap-2">
            <select
              value={trip.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value as Trip['status'])}
              disabled={updateStatusMutation.isPending}
              className="h-9 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB] px-3 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
            >
              {TRIP_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {updateStatusMutation.isPending && (
              <RefreshCw size={14} className="animate-spin text-[#9CA3AF]" />
            )}
          </div>
        </div>

        {trip.notes && (
          <p className="mt-4 pt-4 border-t border-[#F3F4F6] dark:border-[#2C2C2E] text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            {trip.notes}
          </p>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E7EB] dark:border-[#374151]">
        <nav className="flex gap-0 -mb-px" aria-label="Onglets">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-100',
                activeTab === tab.key
                  ? 'border-[#0A7AFF] text-[#0A7AFF]'
                  : 'border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      {activeTab === 'stops' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mb-5">
            Arrêts du trajet
          </h2>
          {stops.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-6">Aucun arrêt configuré.</p>
          ) : (
            <StopsTimeline stops={stops} tripId={tripId} />
          )}
        </div>
      )}

      {activeTab === 'manifest' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mb-5">
            Manifeste des passagers
          </h2>
          <TripManifest
            stops={stops}
            manifest={manifest}
            selectedStopId={selectedManifestStop}
            onStopSelect={setSelectedManifestStop}
          />
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <DataTable<Booking>
            columns={bookingColumns}
            data={bookings}
            rowKey={(r) => r.id}
            emptyMessage="Aucune réservation pour ce trajet."
            pageSize={25}
          />
        </div>
      )}

      {activeTab === 'load' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mb-5">
            Taux de remplissage par arrêt
          </h2>
          {stops.length < 2 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-6">
              Au moins 2 arrêts requis pour afficher le graphique.
            </p>
          ) : (
            <LoadChart stops={stops} bookings={bookings} totalSeats={trip.totalSeats} />
          )}
        </div>
      )}
    </div>
  )
}
