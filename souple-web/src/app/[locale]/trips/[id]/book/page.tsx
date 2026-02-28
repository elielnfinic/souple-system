'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { tripsApi, bookingsApi } from '@/lib/api/trips'
import { RouteTimeline } from '@/components/trips/RouteTimeline'
import { SeatSelector2D } from '@/components/fleet/SeatSelector2D'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel, TextInput } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'
import { ApiError } from '@/lib/api-client'
import type { TripStop, SeatMapEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'Arrêts',
  2: 'Sièges',
  3: 'Passager',
  4: 'Confirmation',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string): string {
  if (currency === 'CDF') return `${amount.toLocaleString('fr-CD')} FC`
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  return (
    <nav aria-label="Étapes de réservation" className="flex items-center justify-center gap-0 mb-8">
      {([1, 2, 3, 4] as Step[]).map((s, idx) => {
        const done = step > s
        const active = step === s
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-150',
                done ? 'bg-[#16A34A] border-[#16A34A] text-white' :
                active ? 'bg-[#0A7AFF] border-[#0A7AFF] text-white' :
                'bg-white dark:bg-[#1C1C1E] border-[#D1D5DB] dark:border-[#4B5563] text-[#9CA3AF]'
              )}>
                {done ? <Check size={14} /> : s}
              </div>
              <span className={cn(
                'text-[10px] font-medium whitespace-nowrap',
                active ? 'text-[#0A7AFF]' : done ? 'text-[#16A34A]' : 'text-[#9CA3AF]'
              )}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {idx < 3 && (
              <div className={cn(
                'w-8 sm:w-16 h-0.5 mb-4 mx-1 transition-colors duration-150',
                done ? 'bg-[#16A34A]' : 'bg-[#E5E7EB] dark:bg-[#374151]'
              )} />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ─── QR Code display ─────────────────────────────────────────────────────────

function BookingQr({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-44 h-44 bg-[#111827] dark:bg-white rounded-xl flex items-center justify-center p-3">
        <div className="grid grid-cols-6 gap-px w-full h-full">
          {Array.from({ length: 36 }, (_, i) => {
            // Deterministic pattern based on code characters
            const char = code.charCodeAt(i % code.length) + i
            return (
              <div
                key={i}
                className={cn(
                  'rounded-[1px]',
                  char % 3 === 0
                    ? 'bg-white dark:bg-[#111827]'
                    : 'bg-[#111827] dark:bg-white'
                )}
              />
            )
          })}
        </div>
      </div>
      <p className="text-xs text-[#9CA3AF]">Code de réservation</p>
      <p className="text-2xl font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tracking-widest">
        {code}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookTripPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'fr'
  const tripId = Number(params?.id)

  const [step, setStep] = useState<Step>(1)
  const [boardingStop, setBoardingStop] = useState<TripStop | null>(null)
  const [alightingStop, setAlightingStop] = useState<TripStop | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmedBooking, setConfirmedBooking] = useState<{ bookingCode: string; totalAmount: number; currency: string } | null>(null)
  const [selectionMode, setSelectionMode] = useState<'boarding' | 'alighting'>('boarding')
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: tripRes } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTrip(tripId),
    enabled: !!tripId,
  })

  const { data: stopsRes } = useQuery({
    queryKey: ['trip-stops', tripId],
    queryFn: () => tripsApi.getTripStops(tripId),
    enabled: !!tripId,
  })

  const { data: seatsRes, isLoading: seatsLoading } = useQuery({
    queryKey: ['trip-seats', tripId, boardingStop?.stopOrder, alightingStop?.stopOrder],
    queryFn: () =>
      tripsApi.getTripSeats(tripId, boardingStop!.stopOrder, alightingStop!.stopOrder),
    enabled: !!boardingStop && !!alightingStop && step === 2,
  })

  const trip = tripRes?.data
  const stops = stopsRes?.data ?? []
  const seatEntries: SeatMapEntry[] = seatsRes?.data ?? []

  // Build availability map for SeatSelector2D
  const availability: Record<string, 'available' | 'booked' | 'locked'> = {}
  for (const entry of seatEntries) {
    if (entry.status === 'available') availability[entry.seatIdentifier] = 'available'
    else if (entry.status === 'booked') availability[entry.seatIdentifier] = 'booked'
    else availability[entry.seatIdentifier] = 'locked'
  }

  // Calculate price from seat entries
  useEffect(() => {
    if (seatEntries.length > 0 && selectedSeats.length > 0) {
      const pricePerSeat = seatEntries.find((s) => selectedSeats.includes(s.seatIdentifier))?.fullTripPrice ?? 0
      setCalculatedPrice(pricePerSeat * selectedSeats.length)
    }
  }, [seatEntries, selectedSeats])

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const bookMutation = useMutation({
    mutationFn: () =>
      bookingsApi.createBooking({
        tripId,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        boardingStopId: boardingStop!.id,
        alightingStopId: alightingStop!.id,
        seatIdentifiers: selectedSeats,
        source: 'web',
      }),
    onSuccess: (res) => {
      setConfirmedBooking({
        bookingCode: res.data.bookingCode,
        totalAmount: res.data.totalAmount,
        currency: res.data.currency,
      })
      setStep(4)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors({ root: err.message })
      }
    },
  })

  // ── Step handlers ────────────────────────────────────────────────────────────

  function handleStopClick(stop: TripStop) {
    if (selectionMode === 'boarding') {
      setBoardingStop(stop)
      setAlightingStop(null)
      setSelectionMode('alighting')
    } else {
      if (stop.stopOrder <= (boardingStop?.stopOrder ?? -1)) {
        setErrors({ stops: 'L\'arrêt de descente doit être après l\'arrêt de montée.' })
        return
      }
      setAlightingStop(stop)
      setSelectionMode('boarding')
      setErrors({})
    }
  }

  function handleSeatSelect(seatId: string) {
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    )
  }

  function handleStep1Next() {
    if (!boardingStop || !alightingStop) {
      setErrors({ stops: 'Sélectionnez un arrêt de montée et un arrêt de descente.' })
      return
    }
    setErrors({})
    setStep(2)
  }

  function handleStep2Next() {
    if (selectedSeats.length === 0) {
      setErrors({ seats: 'Sélectionnez au moins un siège.' })
      return
    }
    setErrors({})
    setStep(3)
  }

  function handleStep3Next() {
    const errs: Record<string, string> = {}
    if (!passengerName.trim()) errs.name = 'Le nom est requis.'
    if (!passengerPhone.trim()) errs.phone = 'Le téléphone est requis.'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    bookMutation.mutate()
  }

  const currency = seatEntries[0]?.currency ?? 'CDF'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] py-8">
      <div className="max-w-[640px] mx-auto px-4">

        {/* Back link */}
        <button
          type="button"
          onClick={() => step > 1 && step < 4 ? setStep((s) => (s - 1) as Step) : router.push(`/${locale}/trips`)}
          className="flex items-center gap-1 text-sm text-[#0A7AFF] hover:underline mb-6"
        >
          <ChevronLeft size={14} />
          {step > 1 && step < 4 ? 'Retour' : 'Tous les trajets'}
        </button>

        {/* Title */}
        {trip && (
          <div className="mb-4">
            <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              Réservation
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={trip.status} />
              <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                Départ {formatTime(trip.departureAt)}
              </span>
            </div>
          </div>
        )}

        {/* Stepper */}
        <Stepper step={step} />

        {/* Error banner */}
        {errors.root && (
          <div className="mb-4 rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
            {errors.root}
          </div>
        )}

        {/* ── Step 1: Stop selection ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-6">
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
              Choisissez vos arrêts
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-5">
              {selectionMode === 'boarding'
                ? 'Cliquez sur votre arrêt de montée.'
                : 'Maintenant cliquez sur votre arrêt de descente.'}
            </p>

            {/* Progress hint */}
            <div className="flex items-center gap-3 mb-5 text-sm">
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                boardingStop ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F3F4F6] dark:bg-[#374151] text-[#9CA3AF]'
              )}>
                Montée: {boardingStop?.city?.name ?? '—'}
              </span>
              <ChevronRight size={12} className="text-[#D1D5DB]" />
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                alightingStop ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F3F4F6] dark:bg-[#374151] text-[#9CA3AF]'
              )}>
                Descente: {alightingStop?.city?.name ?? '—'}
              </span>
            </div>

            {errors.stops && (
              <p className="text-xs text-[#DC2626] mb-3">{errors.stops}</p>
            )}

            {stops.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF] text-sm animate-pulse">
                Chargement des arrêts...
              </div>
            ) : (
              <RouteTimeline
                stops={stops}
                boardingStopId={boardingStop?.id}
                alightingStopId={alightingStop?.id}
                onStopClick={handleStopClick}
                selectionMode={selectionMode}
              />
            )}

            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={handleStep1Next}
                trailingIcon={<ChevronRight size={16} />}
                disabled={!boardingStop || !alightingStop}
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Seat selection ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-6">
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
              Choisissez vos sièges
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-5">
              {boardingStop?.city?.name} → {alightingStop?.city?.name}
            </p>

            {errors.seats && (
              <p className="text-xs text-[#DC2626] mb-3">{errors.seats}</p>
            )}

            {seatsLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-11 h-11 rounded-lg bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                ))}
              </div>
            ) : seatEntries.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF] text-sm">
                Aucun siège disponible pour ce segment.
              </div>
            ) : trip?.vehicle?.seatLayouts?.[0]?.layoutData ? (
              <SeatSelector2D
                layoutData={trip.vehicle.seatLayouts[0].layoutData}
                availability={availability}
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatSelect}
              />
            ) : (
              /* Fallback flat grid from seat entries */
              <div className="flex flex-wrap gap-2" role="group" aria-label="Sièges disponibles">
                {seatEntries.map((seat) => {
                  const status = seat.status ?? 'available'
                  const isSelected = selectedSeats.includes(seat.seatIdentifier)
                  const isAvailable = status === 'available'
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={isAvailable ? () => handleSeatSelect(seat.seatIdentifier) : undefined}
                      aria-label={`Siège ${seat.seatIdentifier} — ${status}`}
                      aria-pressed={isSelected}
                      className={cn(
                        'w-12 h-12 rounded-xl border-2 text-xs font-bold transition-all duration-100',
                        isAvailable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50',
                        isSelected
                          ? 'bg-[#0A7AFF] border-[#0A7AFF] text-white ring-2 ring-offset-1 ring-[#0A7AFF]'
                          : status === 'available'
                          ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8]'
                          : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#9CA3AF]'
                      )}
                    >
                      {seat.seatIdentifier}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedSeats.length > 0 && calculatedPrice != null && (
              <div className="mt-4 pt-4 border-t border-[#F3F4F6] dark:border-[#2C2C2E] flex items-center justify-between">
                <span className="text-sm text-[#374151] dark:text-[#D1D5DB]">
                  {selectedSeats.length} siège{selectedSeats.length > 1 ? 's' : ''}
                </span>
                <span className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {formatPrice(calculatedPrice, currency)}
                </span>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={handleStep2Next}
                trailingIcon={<ChevronRight size={16} />}
                disabled={selectedSeats.length === 0}
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Passenger details ────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-6">
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
              Informations du passager
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-5">
              Ces informations figureront sur votre billet.
            </p>

            {/* Booking summary */}
            <div className="mb-5 p-4 bg-[#F9FAFB] dark:bg-[#111827] rounded-xl text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Trajet</span>
                <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                  {boardingStop?.city?.name} → {alightingStop?.city?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Sièges</span>
                <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                  {selectedSeats.join(', ')}
                </span>
              </div>
              {calculatedPrice != null && (
                <div className="flex justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#374151]">
                  <span className="text-[#6B7280]">Total</span>
                  <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {formatPrice(calculatedPrice, currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <FormField>
                <FormLabel htmlFor="passenger-name" required>Nom complet</FormLabel>
                <TextInput
                  id="passenger-name"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Jean-Marie Kabila"
                  error={errors.name}
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="passenger-phone" required>Téléphone</FormLabel>
                <TextInput
                  id="passenger-phone"
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="+243 8X XXX XXXX"
                  error={errors.phone}
                />
              </FormField>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={handleStep3Next}
                loading={bookMutation.isPending}
                trailingIcon={<Check size={16} />}
              >
                Confirmer la réservation
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ─────────────────────────────────────────── */}
        {step === 4 && confirmedBooking && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-6 text-center">
            <div className="w-12 h-12 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-[#16A34A]" />
            </div>
            <h2 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
              Réservation confirmée !
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6">
              Votre billet a été émis. Présentez ce code à l'embarquement.
            </p>

            <BookingQr code={confirmedBooking.bookingCode} />

            <div className="mt-6 p-4 bg-[#F9FAFB] dark:bg-[#111827] rounded-xl text-sm space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Montée</span>
                <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                  {boardingStop?.city?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Descente</span>
                <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                  {alightingStop?.city?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Sièges</span>
                <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                  {selectedSeats.join(', ')}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#374151]">
                <span className="text-[#6B7280]">Montant payé</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {formatPrice(confirmedBooking.totalAmount, confirmedBooking.currency)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" onClick={() => window.print()}>
                Télécharger le billet
              </Button>
              <Button variant="primary" onClick={() => router.push(`/${locale}/trips`)}>
                Retour aux trajets
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
