'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormError, TextInput } from '@/components/ui/form-field'
import { api, ApiError } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleForm {
  type: string
  brand: string
  model: string
  year: string
  color: string
  plateNumber: string
  totalSeats: string
  visibility: 'public' | 'private'
  availableForRental: boolean
}

type FieldErrors = Partial<Record<keyof VehicleForm, string>>

const VEHICLE_TYPES = ['minibus', 'bus', 'sedan', 'van', 'pickup']

const INITIAL: VehicleForm = {
  type: 'minibus',
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  color: '',
  plateNumber: '',
  totalSeats: '',
  visibility: 'public',
  availableForRental: false,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewVehiclePage() {
  const router = useRouter()
  const [form, setForm] = useState<VehicleForm>(INITIAL)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function set<K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!form.brand.trim()) next.brand = 'Brand is required'
    if (!form.model.trim()) next.model = 'Model is required'
    const year = Number(form.year)
    if (!form.year || isNaN(year) || year < 1990 || year > 2030) {
      next.year = 'Enter a valid year (1990–2030)'
    }
    if (!form.plateNumber.trim()) next.plateNumber = 'Plate number is required'
    const seats = Number(form.totalSeats)
    if (!form.totalSeats || isNaN(seats) || seats < 1 || seats > 200) {
      next.totalSeats = 'Enter a valid number of seats (1–200)'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setGlobalError(null)

    try {
      await api.post('/vehicles', {
        type: form.type,
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        color: form.color.trim() || undefined,
        plateNumber: form.plateNumber.trim(),
        totalSeats: Number(form.totalSeats),
        visibility: form.visibility,
        availableForRental: form.availableForRental,
      })
      router.push('../vehicles')
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const next: FieldErrors = {}
        err.details.forEach(({ field, message }) => {
          next[field as keyof VehicleForm] = message
        })
        setErrors(next)
      } else {
        setGlobalError(err instanceof Error ? err.message : 'Failed to create vehicle')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="../vehicles">
          <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft size={16} />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Add Vehicle
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
            Register a new vehicle to your fleet.
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {globalError && (
              <div
                role="alert"
                className="rounded-md bg-[#FEE2E2] dark:bg-[#450A0A] border border-[#DC2626]/20 px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]"
              >
                {globalError}
              </div>
            )}

            {/* Type */}
            <FormField>
              <FormLabel htmlFor="type" required>
                Type
              </FormLabel>
              <select
                id="type"
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB] px-3 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="brand" required>
                  Brand
                </FormLabel>
                <TextInput
                  id="brand"
                  placeholder="e.g. Toyota"
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  error={errors.brand}
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="model" required>
                  Model
                </FormLabel>
                <TextInput
                  id="model"
                  placeholder="e.g. Hiace"
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                  error={errors.model}
                />
              </FormField>
            </div>

            {/* Year + Color */}
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="year" required>
                  Year
                </FormLabel>
                <TextInput
                  id="year"
                  type="number"
                  placeholder="e.g. 2020"
                  value={form.year}
                  onChange={(e) => set('year', e.target.value)}
                  error={errors.year}
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="color">Color</FormLabel>
                <TextInput
                  id="color"
                  placeholder="e.g. White"
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                />
              </FormField>
            </div>

            {/* Plate + Seats */}
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="plateNumber" required>
                  Plate Number
                </FormLabel>
                <TextInput
                  id="plateNumber"
                  placeholder="e.g. KIN-1234-A"
                  value={form.plateNumber}
                  onChange={(e) => set('plateNumber', e.target.value)}
                  error={errors.plateNumber}
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="totalSeats" required>
                  Total Seats
                </FormLabel>
                <TextInput
                  id="totalSeats"
                  type="number"
                  placeholder="e.g. 14"
                  value={form.totalSeats}
                  onChange={(e) => set('totalSeats', e.target.value)}
                  error={errors.totalSeats}
                />
              </FormField>
            </div>

            {/* Visibility */}
            <FormField>
              <FormLabel htmlFor="visibility">Visibility</FormLabel>
              <select
                id="visibility"
                value={form.visibility}
                onChange={(e) => set('visibility', e.target.value as 'public' | 'private')}
                className="w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB] px-3 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </FormField>

            {/* Available for Rental toggle */}
            <FormField>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.availableForRental}
                  onClick={() => set('availableForRental', !form.availableForRental)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-2 ${
                    form.availableForRental ? 'bg-[#0A7AFF]' : 'bg-[#D1D5DB] dark:bg-[#4B5563]'
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      form.availableForRental ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Available for Rental
                </span>
              </label>
            </FormField>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
              <Button type="submit" loading={isSubmitting}>
                Create Vehicle
              </Button>
              <Link href="../vehicles">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
