'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, RefreshCw, Ticket, Clock, Users, AlertCircle } from 'lucide-react'
import { tripsApi, bookingsApi } from '@/lib/api/trips'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel, TextInput } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { Trip, TripStop, SeatMapEntry, Booking } from '@/lib/types'
import type { CreateBookingData } from '@/lib/api/trips'
import { ApiError } from '@/lib/api-client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-CD', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'CDF') return `${amount.toLocaleString('fr-CD')} FC`
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

function today(): string {
  return new Date().toLocaleDateString('fr-CD', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Seat status colors ───────────────────────────────────────────────────────

const SEAT_COLORS = {
  available: { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' },
  booked:    { bg: '#F3F4F6', border: '#D1D5DB', text: '#9CA3AF' },
  reserved:  { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  blocked:   { bg: '#FEE2E2', border: '#FCA5A5', text: '#DC2626' },
} as const

// ─── Trip card in left panel ──────────────────────────────────────────────────

interface TripListItemProps {
  trip: Trip
  selected: boolean
  onSelect: () => void
}

function TripListItem({ trip, selected, onSelect }: TripListItemProps) {
  const sortedStops = [...(trip.stops ?? [])].sort((a, b) => a.stopOrder - b.stopOrder)
  const from = sortedStops[0]?.city?.name ?? '—'
  const to = sortedStops[sortedStops.length - 1]?.city?.name ?? '—'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-4 py-3 rounded-xl border transition-all duration-100 cursor-pointer',
        selected
          ? 'border-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10'
          : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1C1C1E] hover:border-[#93C5FD] hover:bg-[#F8FBFF] dark:hover:bg-[#0A7AFF]/5'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
            {from} → {to}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#9CA3AF] flex items-center gap-1">
              <Clock size={10} />
              {formatTime(trip.departureAt)}
            </span>
            <span className="text-xs text-[#9CA3AF] flex items-center gap-1">
              <Users size={10} />
              {trip.totalSeats} sièges
            </span>
          </div>
        </div>
        <StatusBadge status={trip.status} />
      </div>
    </button>
  )
}

// ─── POS seat grid ────────────────────────────────────────────────────────────

interface PosSeatGridProps {
  seats: SeatMapEntry[]
  selectedSeats: string[]
  onToggle: (id: string) => void
}

function PosSeatGrid({ seats, selectedSeats, onToggle }: PosSeatGridProps) {
  if (seats.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Grille des sièges">
      {seats.map((seat) => {
        const status = seat.status ?? 'available'
        const isSelected = selectedSeats.includes(seat.seatIdentifier)
        const isAvailable = status === 'available'
        const colors = SEAT_COLORS[status] ?? SEAT_COLORS.available

        return (
          <button
            key={seat.id}
            type="button"
            disabled={!isAvailable}
            onClick={isAvailable ? () => onToggle(seat.seatIdentifier) : undefined}
            aria-label={`Siège ${seat.seatIdentifier} — ${status}`}
            aria-pressed={isSelected}
            className={cn(
              'w-11 h-11 rounded-lg border-2 text-xs font-bold transition-all duration-100',
              isAvailable ? 'cursor-pointer hover:scale-105 hover:shadow-sm active:scale-95' : 'cursor-not-allowed opacity-60',
              isSelected && 'ring-2 ring-offset-1 ring-[#0A7AFF]'
            )}
            style={{
              backgroundColor: isSelected ? '#0A7AFF' : colors.bg,
              borderColor: isSelected ? '#0A7AFF' : colors.border,
              color: isSelected ? 'white' : colors.text,
            }}
          >
            {seat.seatIdentifier}
          </button>
        )
      })}
    </div>
  )
}

// ─── Recent sales row ─────────────────────────────────────────────────────────

function RecentSaleRow({ booking }: { booking: Booking }) {
  const from = booking.boardingStop?.city?.name ?? `Arrêt ${booking.boardingStopOrder}`
  const to = booking.alightingStop?.city?.name ?? `Arrêt ${booking.alightingStopOrder}`

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] dark:border-[#2C2C2E] last:border-0 gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] truncate">
          {booking.passengerName}
        </p>
        <p className="text-xs text-[#9CA3AF] truncate">
          {from} → {to} · {booking.seats?.map((s) => s.tripSeat?.seatIdentifier).join(', ') ?? `${booking.seatCount} siège(s)`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
          {formatPrice(booking.totalAmount, booking.currency)}
        </p>
        <StatusBadge status={booking.status} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosPage() {
  const queryClient = useQueryClient()

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [boardingStopId, setBoardingStopId] = useState<number>(0)
  const [alightingStopId, setAlightingStopId] = useState<number>(0)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [formError, setFormError] = useState('')
  const [lastIssued, setLastIssued] = useState<{ code: string; amount: number; currency: string } | null>(null)

  // ── Today's trips ──────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: tripsRes, isFetching: tripsFetching, refetch: refetchTrips } = useQuery({
    queryKey: ['pos-trips', todayStr],
    queryFn: () =>
      tripsApi.getTrips({ dateFrom: todayStr, perPage: 50 }),
    refetchInterval: 30000, // auto-refresh every 30s
  })
  const trips = tripsRes?.data ?? []

  // ── Trip stops ─────────────────────────────────────────────────────────────
  const { data: stopsRes } = useQuery({
    queryKey: ['trip-stops', selectedTrip?.id],
    queryFn: () => tripsApi.getTripStops(selectedTrip!.id),
    enabled: !!selectedTrip,
  })
  const stops: TripStop[] = stopsRes?.data ?? []

  // ── Seat map ───────────────────────────────────────────────────────────────
  const boardingStop = stops.find((s) => s.id === boardingStopId)
  const alightingStop = stops.find((s) => s.id === alightingStopId)

  const { data: seatsRes, isLoading: seatsLoading } = useQuery({
    queryKey: ['pos-seats', selectedTrip?.id, boardingStop?.stopOrder, alightingStop?.stopOrder],
    queryFn: () =>
      tripsApi.getTripSeats(
        selectedTrip!.id,
        boardingStop!.stopOrder,
        alightingStop!.stopOrder
      ),
    enabled: !!selectedTrip && !!boardingStop && !!alightingStop,
  })
  const seats: SeatMapEntry[] = seatsRes?.data ?? []

  // ── Recent sales ───────────────────────────────────────────────────────────
  const { data: recentRes, refetch: refetchRecent } = useQuery({
    queryKey: ['pos-recent', selectedTrip?.id],
    queryFn: () =>
      bookingsApi.getBookings({ tripId: selectedTrip!.id, perPage: 10 }),
    enabled: !!selectedTrip,
  })
  const recentBookings: Booking[] = recentRes?.data ?? []

  // ── Shift summary ──────────────────────────────────────────────────────────
  const totalSold = recentBookings.filter((b) => b.status !== 'cancelled').length
  const totalRevenue = recentBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((s, b) => s + b.totalAmount, 0)
  const revCurrency = recentBookings[0]?.currency ?? 'CDF'

  // ── Price calculation ─────────────────────────────────────────────────────
  const pricePerSeat = seats.find((s) => selectedSeats.includes(s.seatIdentifier))?.fullTripPrice ?? 0
  const totalPrice = pricePerSeat * selectedSeats.length
  const seatCurrency = seats[0]?.currency ?? 'CDF'

  // Reset seats when stops change
  useEffect(() => {
    setSelectedSeats([])
  }, [boardingStopId, alightingStopId])

  // Reset form when trip changes
  useEffect(() => {
    setBoardingStopId(0)
    setAlightingStopId(0)
    setSelectedSeats([])
    setPassengerName('')
    setPassengerPhone('')
    setFormError('')
    setLastIssued(null)
  }, [selectedTrip?.id])

  // ── Issue ticket mutation ─────────────────────────────────────────────────
  const issueMutation = useMutation({
    mutationFn: () => {
      const data: CreateBookingData = {
        tripId: selectedTrip!.id,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        boardingStopId,
        alightingStopId,
        seatIdentifiers: selectedSeats,
        source: 'pos',
      }
      return bookingsApi.createBooking(data)
    },
    onSuccess: (res) => {
      setLastIssued({
        code: res.data.bookingCode,
        amount: res.data.totalAmount,
        currency: res.data.currency,
      })
      setPassengerName('')
      setPassengerPhone('')
      setSelectedSeats([])
      setFormError('')
      queryClient.invalidateQueries({ queryKey: ['pos-recent', selectedTrip?.id] })
      queryClient.invalidateQueries({ queryKey: ['pos-seats', selectedTrip?.id] })
      refetchRecent()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('Une erreur inattendue s\'est produite.')
      }
    },
  })

  function handleIssue() {
    setFormError('')
    if (!selectedTrip) { setFormError('Sélectionnez un trajet.'); return }
    if (!boardingStopId || !alightingStopId) { setFormError('Sélectionnez les arrêts de montée et descente.'); return }
    if (selectedSeats.length === 0) { setFormError('Sélectionnez au moins un siège.'); return }
    if (!passengerName.trim()) { setFormError('Le nom du passager est requis.'); return }
    if (!passengerPhone.trim()) { setFormError('Le téléphone est requis.'); return }
    issueMutation.mutate()
  }

  const selectClass = cn(
    'w-full h-10 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563]',
    'bg-white dark:bg-[#111827]',
    'text-sm text-[#111827] dark:text-[#F9FAFB]',
    'px-3 appearance-none pr-7',
    'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
    'transition-colors duration-100'
  )

  return (
    <div className="space-y-4 max-w-none">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">Point de vente</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] capitalize">{today()}</p>
        </div>
        {/* Shift summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-[#111827] dark:text-[#F9FAFB]">{totalSold}</div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">Billets</div>
          </div>
          <div className="w-px h-8 bg-[#E5E7EB] dark:bg-[#374151]" />
          <div className="text-center">
            <div className="font-bold text-[#111827] dark:text-[#F9FAFB]">
              {totalRevenue > 0 ? formatPrice(totalRevenue, revCurrency) : '—'}
            </div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">Recettes</div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

        {/* ═══ LEFT: Today's trips ════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Trajets d'aujourd'hui
            </h2>
            <button
              type="button"
              onClick={() => refetchTrips()}
              disabled={tripsFetching}
              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors"
              title="Actualiser"
              aria-label="Actualiser"
            >
              <RefreshCw size={13} className={tripsFetching ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {tripsFetching && trips.length === 0 && (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#F3F4F6] dark:bg-[#374151] animate-pulse" />
              ))
            )}
            {trips.length === 0 && !tripsFetching && (
              <p className="text-center py-8 text-sm text-[#9CA3AF]">
                Aucun trajet planifié aujourd'hui.
              </p>
            )}
            {trips.map((trip) => (
              <TripListItem
                key={trip.id}
                trip={trip}
                selected={selectedTrip?.id === trip.id}
                onSelect={() => setSelectedTrip(trip)}
              />
            ))}
          </div>
        </div>

        {/* ═══ RIGHT: Issue ticket panel ══════════════════════════════════ */}
        {!selectedTrip ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-12 text-center">
            <Ticket size={40} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="font-medium text-[#374151] dark:text-[#D1D5DB]">
              Sélectionnez un trajet
            </p>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Cliquez sur un trajet à gauche pour commencer à émettre des billets.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Success flash */}
            {lastIssued && (
              <div className="bg-[#F0FDF4] dark:bg-[#16A34A]/10 border border-[#86EFAC] dark:border-[#16A34A]/30 rounded-xl px-5 py-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-[#16A34A] shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-[#16A34A]">Billet émis !</p>
                  <p className="text-sm text-[#16A34A]/80 font-mono">
                    {lastIssued.code} · {formatPrice(lastIssued.amount, lastIssued.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLastIssued(null)}
                  className="text-[#16A34A]/60 hover:text-[#16A34A] transition-colors"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error */}
            {formError && (
              <div className="bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            {/* Main issue form */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 space-y-5">

              {/* Stop selectors */}
              <div className="grid grid-cols-2 gap-3">
                <FormField>
                  <FormLabel htmlFor="boarding-stop">Montée</FormLabel>
                  <div className="relative">
                    <select
                      id="boarding-stop"
                      value={boardingStopId}
                      onChange={(e) => { setBoardingStopId(Number(e.target.value)); setAlightingStopId(0) }}
                      className={selectClass}
                    >
                      <option value={0} disabled>Arrêt de montée...</option>
                      {stops
                        .filter((s) => s.boardingEnabled)
                        .sort((a, b) => a.stopOrder - b.stopOrder)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.city?.name ?? s.stopName ?? `Arrêt ${s.stopOrder + 1}`}
                          </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="alighting-stop">Descente</FormLabel>
                  <div className="relative">
                    <select
                      id="alighting-stop"
                      value={alightingStopId}
                      onChange={(e) => setAlightingStopId(Number(e.target.value))}
                      disabled={!boardingStopId}
                      className={cn(selectClass, !boardingStopId && 'opacity-50 cursor-not-allowed')}
                    >
                      <option value={0} disabled>Arrêt de descente...</option>
                      {stops
                        .filter((s) => s.alightingEnabled && s.stopOrder > (boardingStop?.stopOrder ?? -1))
                        .sort((a, b) => a.stopOrder - b.stopOrder)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.city?.name ?? s.stopName ?? `Arrêt ${s.stopOrder + 1}`}
                          </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </FormField>
              </div>

              {/* Price display */}
              {boardingStopId > 0 && alightingStopId > 0 && seats.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-[#F9FAFB] dark:bg-[#111827] rounded-xl">
                  <span className="text-sm text-[#6B7280]">Prix par siège</span>
                  <span className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {pricePerSeat > 0 ? formatPrice(pricePerSeat, seatCurrency) : '—'}
                  </span>
                </div>
              )}

              {/* Seat grid */}
              {boardingStopId > 0 && alightingStopId > 0 && (
                <div>
                  <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-3">
                    Sièges disponibles
                  </p>
                  {seatsLoading ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="w-11 h-11 rounded-lg bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                      ))}
                    </div>
                  ) : seats.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF]">Aucun siège disponible pour ce segment.</p>
                  ) : (
                    <PosSeatGrid
                      seats={seats}
                      selectedSeats={selectedSeats}
                      onToggle={(id) =>
                        setSelectedSeats((prev) =>
                          prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
                        )
                      }
                    />
                  )}
                  {selectedSeats.length > 0 && (
                    <p className="mt-2 text-sm text-[#374151] dark:text-[#D1D5DB]">
                      {selectedSeats.length} siège{selectedSeats.length > 1 ? 's' : ''} sélectionné{selectedSeats.length > 1 ? 's' : ''}
                      {totalPrice > 0 && (
                        <span className="ml-2 font-bold text-[#0A7AFF]">
                          = {formatPrice(totalPrice, seatCurrency)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Passenger form */}
              <div className="grid grid-cols-2 gap-3">
                <FormField>
                  <FormLabel htmlFor="pos-name" required>Nom du passager</FormLabel>
                  <TextInput
                    id="pos-name"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Jean-Marie Kabila"
                    onKeyDown={(e) => e.key === 'Enter' && handleIssue()}
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="pos-phone" required>Téléphone</FormLabel>
                  <TextInput
                    id="pos-phone"
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="+243 8X XXX XXXX"
                    onKeyDown={(e) => e.key === 'Enter' && handleIssue()}
                  />
                </FormField>
              </div>

              {/* Issue button — large and prominent */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                loading={issueMutation.isPending}
                onClick={handleIssue}
                leadingIcon={<Ticket size={18} />}
                disabled={
                  issueMutation.isPending ||
                  !boardingStopId ||
                  !alightingStopId ||
                  selectedSeats.length === 0 ||
                  !passengerName.trim() ||
                  !passengerPhone.trim()
                }
              >
                Émettre le billet
              </Button>
            </div>

            {/* ── Recent sales ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-5 py-3 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
                <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                  Ventes récentes
                </h3>
              </div>
              <div className="px-5 py-1">
                {recentBookings.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] py-5 text-center">
                    Aucune vente pour ce trajet.
                  </p>
                ) : (
                  recentBookings.slice(0, 10).map((b) => (
                    <RecentSaleRow key={b.id} booking={b} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
