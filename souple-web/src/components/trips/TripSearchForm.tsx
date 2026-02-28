'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { citiesApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel, TextInput } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface City {
  id: number
  name: string
  province?: string | null
}

export interface TripSearchParams {
  fromCityId: number
  toCityId: number
  date: string
  passengers: number
}

interface TripSearchFormProps {
  onSearch: (params: TripSearchParams) => void
  loading?: boolean
}

// ─── Select class (reusable) ──────────────────────────────────────────────────

const selectClass = cn(
  'w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-base text-[#111827] dark:text-[#F9FAFB]',
  'px-3 appearance-none pr-8',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
  'transition-colors duration-100'
)

// ─── Component ────────────────────────────────────────────────────────────────

export function TripSearchForm({ onSearch, loading }: TripSearchFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [fromCityId, setFromCityId] = useState<number>(0)
  const [toCityId, setToCityId] = useState<number>(0)
  const [date, setDate] = useState<string>(today)
  const [passengers, setPassengers] = useState<number>(1)
  const [error, setError] = useState<string>('')

  const { data: citiesRes } = useQuery({
    queryKey: ['cities', 'all'],
    queryFn: () => citiesApi.list({ perPage: 200 }) as Promise<{ data: City[] }>,
  })

  const cities = citiesRes?.data ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromCityId || !toCityId) {
      setError('Sélectionnez la ville de départ et d\'arrivée.')
      return
    }
    if (fromCityId === toCityId) {
      setError('La ville de départ et d\'arrivée doivent être différentes.')
      return
    }
    if (!date) {
      setError('Sélectionnez une date.')
      return
    }
    setError('')
    onSearch({ fromCityId, toCityId, date, passengers })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6"
    >
      <h2 className="text-lg font-semibold text-[#111827] dark:text-[#F9FAFB] mb-5">
        Rechercher un trajet
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* From city */}
        <FormField>
          <FormLabel htmlFor="from-city" required>Départ</FormLabel>
          <div className="relative">
            <select
              id="from-city"
              value={fromCityId}
              onChange={(e) => setFromCityId(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0} disabled>Choisir une ville...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}{city.province ? ` (${city.province})` : ''}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </FormField>

        {/* To city */}
        <FormField>
          <FormLabel htmlFor="to-city" required>Arrivée</FormLabel>
          <div className="relative">
            <select
              id="to-city"
              value={toCityId}
              onChange={(e) => setToCityId(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0} disabled>Choisir une ville...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}{city.province ? ` (${city.province})` : ''}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </FormField>

        {/* Date */}
        <FormField>
          <FormLabel htmlFor="travel-date" required>Date</FormLabel>
          <TextInput
            id="travel-date"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>

        {/* Passengers */}
        <FormField>
          <FormLabel htmlFor="passengers">Passagers</FormLabel>
          <TextInput
            id="passengers"
            type="number"
            value={String(passengers)}
            min={1}
            max={50}
            onChange={(e) => setPassengers(Math.max(1, Number(e.target.value)))}
          />
        </FormField>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          leadingIcon={<Search size={16} />}
        >
          Rechercher
        </Button>
      </div>
    </form>
  )
}
