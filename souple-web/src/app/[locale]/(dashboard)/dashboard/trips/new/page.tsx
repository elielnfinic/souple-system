'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { tripsApi } from '@/lib/api/trips'
import { vehiclesApi, seatLayoutsApi } from '@/lib/api/vehicles'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel, FormError, TextInput } from '@/components/ui/form-field'
import { ApiError, routesApi } from '@/lib/api-client'
import { cn } from '@/lib/utils'

// ─── Select class ─────────────────────────────────────────────────────────────

const selectClass = cn(
  'w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-base text-[#111827] dark:text-[#F9FAFB]',
  'px-3 appearance-none pr-8',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
  'transition-colors duration-100'
)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewTripPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'fr'
  const queryClient = useQueryClient()

  // Form state
  const [vehicleId, setVehicleId] = useState<number>(0)
  const [routeId, setRouteId] = useState<number>(0)
  const [seatLayoutId, setSeatLayoutId] = useState<number>(0)
  const [driverUserId, setDriverUserId] = useState<number>(0)
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [notes, setNotes] = useState('')
  const [allowIntermediate, setAllowIntermediate] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Queries
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles', 'all'],
    queryFn: () => vehiclesApi.list({ perPage: 100 }),
  })

  const { data: routesRes } = useQuery({
    queryKey: ['routes', 'all'],
    queryFn: () => routesApi.list({ perPage: 100 }) as Promise<{ data: Array<{ id: number; fromCity?: { name: string }; toCity?: { name: string } }> }>,
  })

  const { data: layoutsRes } = useQuery({
    queryKey: ['seat-layouts', vehicleId],
    queryFn: () => seatLayoutsApi.list(vehicleId),
    enabled: vehicleId > 0,
  })

  // Auto-select default layout when vehicle changes
  const layouts = layoutsRes?.data ?? []
  const vehicles = vehiclesRes?.data ?? []
  const routes = routesRes?.data ?? []

  // Mutation
  const mutation = useMutation({
    mutationFn: () => {
      const departureAt = `${departureDate}T${departureTime}:00`
      return tripsApi.createTrip({
        vehicleId,
        routeId,
        seatLayoutId,
        driverUserId,
        departureAt,
        notes: notes.trim() || undefined,
        allowIntermediateBoarding: allowIntermediate,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      router.push(`/${locale}/dashboard/trips`)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        const fieldErrors: Record<string, string> = {}
        for (const d of err.details) {
          fieldErrors[d.field] = d.message
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ root: err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite.' })
      }
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!vehicleId) errs.vehicleId = 'Sélectionnez un véhicule.'
    if (!routeId) errs.routeId = 'Sélectionnez un itinéraire.'
    if (!seatLayoutId) errs.seatLayoutId = 'Sélectionnez une configuration de sièges.'
    if (!driverUserId) errs.driverUserId = 'Sélectionnez un chauffeur.'
    if (!departureDate) errs.departureDate = 'Sélectionnez une date de départ.'
    if (!departureTime) errs.departureTime = 'Sélectionnez une heure de départ.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-[640px]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <Link
          href={`/${locale}/dashboard/trips`}
          className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] mb-4"
        >
          <ChevronLeft size={14} />
          Retour aux trajets
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
          Nouveau trajet
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
          Planifiez un nouveau départ de bus.
        </p>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-5"
      >
        {errors.root && (
          <div className="rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
            {errors.root}
          </div>
        )}

        {/* Vehicle */}
        <FormField>
          <FormLabel htmlFor="vehicle" required>Véhicule</FormLabel>
          <div className="relative">
            <select
              id="vehicle"
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(Number(e.target.value))
                setSeatLayoutId(0)
              }}
              className={selectClass}
            >
              <option value={0} disabled>Sélectionner un véhicule...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} — {v.plateNumber} ({v.totalSeats} sièges)
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <FormError>{errors.vehicleId}</FormError>
        </FormField>

        {/* Seat layout (loads after vehicle selected) */}
        {vehicleId > 0 && (
          <FormField>
            <FormLabel htmlFor="seatLayout" required>Configuration des sièges</FormLabel>
            <div className="relative">
              <select
                id="seatLayout"
                value={seatLayoutId}
                onChange={(e) => setSeatLayoutId(Number(e.target.value))}
                className={selectClass}
              >
                <option value={0} disabled>Sélectionner une configuration...</option>
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.isDefault ? '(par défaut)' : ''}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <FormError>{errors.seatLayoutId}</FormError>
          </FormField>
        )}

        {/* Route */}
        <FormField>
          <FormLabel htmlFor="route" required>Itinéraire</FormLabel>
          <div className="relative">
            <select
              id="route"
              value={routeId}
              onChange={(e) => setRouteId(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0} disabled>Sélectionner un itinéraire...</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fromCity?.name ?? '?'} → {r.toCity?.name ?? '?'}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <FormError>{errors.routeId}</FormError>
        </FormField>

        {/* Driver — simplified: entering user ID directly; real app fetches org members */}
        <FormField>
          <FormLabel htmlFor="driver" required>Chauffeur (ID utilisateur)</FormLabel>
          <TextInput
            id="driver"
            type="number"
            value={driverUserId ? String(driverUserId) : ''}
            onChange={(e) => setDriverUserId(Number(e.target.value))}
            placeholder="ID du chauffeur"
            error={errors.driverUserId}
            min={1}
          />
        </FormField>

        {/* Departure date + time */}
        <div className="grid grid-cols-2 gap-4">
          <FormField>
            <FormLabel htmlFor="dep-date" required>Date de départ</FormLabel>
            <TextInput
              id="dep-date"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              error={errors.departureDate}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="dep-time" required>Heure de départ</FormLabel>
            <TextInput
              id="dep-time"
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              error={errors.departureTime}
            />
          </FormField>
        </div>

        {/* Notes */}
        <FormField>
          <FormLabel htmlFor="notes">Notes</FormLabel>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Informations complémentaires pour ce trajet..."
            className={cn(
              'w-full rounded-md border border-[#D1D5DB] dark:border-[#4B5563]',
              'bg-white dark:bg-[#111827]',
              'text-base text-[#111827] dark:text-[#F9FAFB]',
              'px-3 py-2.5 resize-none',
              'placeholder:text-[#9CA3AF]',
              'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
              'transition-colors duration-100'
            )}
          />
        </FormField>

        {/* Allow intermediate boarding */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={allowIntermediate}
              onChange={(e) => setAllowIntermediate(e.target.checked)}
              className="peer sr-only"
              id="allowIntermediate"
            />
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-100',
              allowIntermediate
                ? 'bg-[#0A7AFF] border-[#0A7AFF]'
                : 'bg-white dark:bg-[#111827] border-[#D1D5DB] dark:border-[#4B5563]'
            )}>
              {allowIntermediate && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
              Permettre l'embarquement intermédiaire
            </span>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
              Les passagers pourront monter et descendre aux arrêts intermédiaires.
            </p>
          </div>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F3F4F6] dark:border-[#2C2C2E]">
          <Link href={`/${locale}/dashboard/trips`}>
            <Button type="button" variant="ghost" size="md">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={mutation.isPending}
          >
            Créer le trajet
          </Button>
        </div>
      </form>
    </div>
  )
}
