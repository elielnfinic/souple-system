'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, Clock, MapPin } from 'lucide-react'
import { bookingsApi } from '@/lib/api/trips'
import { Button } from '@/components/ui/button'
import { TextInput, FormField, FormLabel } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Booking } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-CD', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'CDF') return `${amount.toLocaleString('fr-CD')} FC`
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ─── Booking detail card ──────────────────────────────────────────────────────

function BookingDetail({ booking }: { booking: Booking }) {
  const seats = booking.seats?.map((s) => s.tripSeat?.seatIdentifier).filter(Boolean) ?? []

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-[#F9FAFB] dark:bg-[#111827] border-b border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between">
        <div>
          <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest">Code de réservation</p>
          <p className="text-2xl font-mono font-bold text-[#111827] dark:text-[#F9FAFB] mt-0.5 tracking-widest">
            {booking.bookingCode}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Details */}
      <div className="px-6 py-5 space-y-4">
        {/* Passenger */}
        <div>
          <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest mb-1">Passager</p>
          <p className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">{booking.passengerName}</p>
          <p className="text-sm text-[#6B7280]">{booking.passengerPhone}</p>
        </div>

        {/* Route */}
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest mb-1">
              <span className="inline-flex items-center gap-1"><MapPin size={10} /> Montée</span>
            </p>
            <p className="text-sm font-semibold text-[#16A34A]">
              {booking.boardingStop?.city?.name ?? booking.boardingStop?.stopName ?? `Arrêt ${booking.boardingStopOrder}`}
            </p>
            {booking.boardingStop?.scheduledDepartureAt && (
              <p className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                <Clock size={10} />
                {formatTime(booking.boardingStop.scheduledDepartureAt)}
              </p>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest mb-1">
              <span className="inline-flex items-center gap-1"><MapPin size={10} /> Descente</span>
            </p>
            <p className="text-sm font-semibold text-[#DC2626]">
              {booking.alightingStop?.city?.name ?? booking.alightingStop?.stopName ?? `Arrêt ${booking.alightingStopOrder}`}
            </p>
            {booking.alightingStop?.scheduledArrivalAt && (
              <p className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                <Clock size={10} />
                {formatTime(booking.alightingStop.scheduledArrivalAt)}
              </p>
            )}
          </div>
        </div>

        {/* Seats */}
        {seats.length > 0 && (
          <div>
            <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest mb-1">Sièges</p>
            <div className="flex gap-2 flex-wrap">
              {seats.map((seat) => (
                <span
                  key={seat}
                  className="px-3 py-1 bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 text-[#0A7AFF] font-mono text-sm font-semibold rounded-lg"
                >
                  {seat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="pt-3 border-t border-[#F3F4F6] dark:border-[#2C2C2E] flex items-center justify-between">
          <p className="text-sm text-[#6B7280]">Montant</p>
          <p className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">
            {formatPrice(booking.totalAmount, booking.currency)}
          </p>
        </div>

        {/* Check-in info */}
        {booking.checkedInAt && (
          <div className="p-3 bg-[#F0FDF4] dark:bg-[#16A34A]/10 rounded-xl text-sm text-[#16A34A] font-medium flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            Embarqué le {formatTime(booking.checkedInAt)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrackBookingPage() {
  const params = useParams()
  const router = useRouter()
  const urlCode = (params?.code as string) ?? ''

  const [inputCode, setInputCode] = useState(urlCode.toUpperCase())
  const [searchCode, setSearchCode] = useState(urlCode || '')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['booking-track', searchCode],
    queryFn: () => bookingsApi.trackByCode(searchCode),
    enabled: !!searchCode,
    retry: false,
  })

  const booking: Booking | null = data?.data ?? null

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (inputCode.trim()) {
      setSearchCode(inputCode.trim().toUpperCase())
      router.push(`?code=${inputCode.trim()}`, { scroll: false })
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] py-12">
      <div className="max-w-[560px] mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Suivre ma réservation
          </h1>
          <p className="mt-2 text-[#6B7280] dark:text-[#9CA3AF]">
            Entrez votre code de réservation pour voir l'état de votre billet.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-6 mb-6">
          <FormField>
            <FormLabel htmlFor="booking-code">Code de réservation</FormLabel>
            <div className="flex gap-2 mt-1">
              <TextInput
                id="booking-code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="ex: BK-ABC123"
                className="font-mono text-base tracking-widest uppercase flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                leadingIcon={<Search size={16} />}
                disabled={!inputCode.trim()}
              >
                Rechercher
              </Button>
            </div>
          </FormField>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-12 text-center">
            <div className="h-5 w-40 bg-[#E5E7EB] dark:bg-[#374151] rounded animate-pulse mx-auto mb-3" />
            <div className="h-4 w-64 bg-[#E5E7EB] dark:bg-[#374151] rounded animate-pulse mx-auto" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-8 text-center">
            <p className="text-[#DC2626] font-medium mb-2">Réservation introuvable</p>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Vérifiez votre code de réservation et réessayez.
            </p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Booking detail */}
        {booking && !isLoading && (
          <BookingDetail booking={booking} />
        )}
      </div>
    </div>
  )
}
