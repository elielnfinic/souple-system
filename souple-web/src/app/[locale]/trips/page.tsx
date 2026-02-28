'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TripSearchForm } from '@/components/trips/TripSearchForm'
import { TripCard } from '@/components/trips/TripCard'
import { tripsApi } from '@/lib/api/trips'
import type { TripSearchParams } from '@/components/trips/TripSearchForm'
import type { Trip, TripStop } from '@/lib/types'

// ─── Extended trip result ─────────────────────────────────────────────────────

type TripResult = Trip & {
  fromCity?: string
  toCity?: string
  availableSeats?: number
  lowestPrice?: number
  currency?: string
  stops?: TripStop[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripsSearchPage() {
  const [searchParams, setSearchParams] = useState<TripSearchParams | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['trips', 'search', searchParams],
    queryFn: () =>
      tripsApi.search({
        fromCityId: searchParams!.fromCityId,
        toCityId: searchParams!.toCityId,
        date: searchParams!.date,
        passengers: searchParams!.passengers,
      }),
    enabled: !!searchParams,
  })

  const trips: TripResult[] = (data?.data ?? []) as TripResult[]
  const searching = isLoading || isFetching

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000]">
      <div className="max-w-[860px] mx-auto px-4 py-8 sm:py-12 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Voyages disponibles
          </h1>
          <p className="mt-1 text-[#6B7280] dark:text-[#9CA3AF]">
            Trouvez et réservez votre billet de bus en quelques clics.
          </p>
        </div>

        {/* ── Search form ─────────────────────────────────────────────────── */}
        <TripSearchForm onSearch={setSearchParams} loading={searching} />

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {searchParams && (
          <div>
            {searching ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] animate-pulse"
                  />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-12 text-center">
                <div className="text-4xl mb-3">🚌</div>
                <h3 className="font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                  Aucun trajet disponible
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  Aucun trajet ne correspond à votre recherche pour cette date.
                  Essayez une autre date ou un autre itinéraire.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                  {trips.length} trajet{trips.length > 1 ? 's' : ''} trouvé{trips.length > 1 ? 's' : ''}
                </p>
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </div>
        )}

        {!searchParams && (
          <div className="text-center py-10 text-[#9CA3AF] dark:text-[#6B7280] text-sm">
            Remplissez le formulaire ci-dessus pour voir les trajets disponibles.
          </div>
        )}
      </div>
    </div>
  )
}
