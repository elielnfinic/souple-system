'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { vehiclesApi } from '@/lib/api/vehicles'
import type { Vehicle } from '@/lib/types'
import type { CreateVehicleData } from '@/lib/api/vehicles'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel, FormError, TextInput } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleFormProps {
  vehicle?: Vehicle
  onSuccess: (vehicle: Vehicle) => void
  onCancel?: () => void
}

type FormErrors = Partial<Record<keyof CreateVehicleData | 'root', string>>

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: Array<{ value: Vehicle['type']; label: string }> = [
  { value: 'bus', label: 'Bus' },
  { value: 'minibus', label: 'Minibus' },
  { value: 'van', label: 'Van' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'pickup', label: 'Pickup' },
]

const FEATURES = [
  { value: 'ac', label: 'Air conditioning' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'usb', label: 'USB charging' },
  { value: 'gps', label: 'GPS tracking' },
]

const selectClass = cn(
  'w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-base text-[#111827] dark:text-[#F9FAFB]',
  'px-3 appearance-none pr-8',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
  'transition-colors duration-100'
)

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const isEdit = !!vehicle
  const queryClient = useQueryClient()

  // Form state
  const [type, setType] = useState<Vehicle['type']>(vehicle?.type ?? 'bus')
  const [brand, setBrand] = useState(vehicle?.brand ?? '')
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [year, setYear] = useState(vehicle?.year ? String(vehicle.year) : '')
  const [color, setColor] = useState(vehicle?.color ?? '')
  const [plateNumber, setPlateNumber] = useState(vehicle?.plateNumber ?? '')
  const [totalSeats, setTotalSeats] = useState(vehicle?.totalSeats ? String(vehicle.totalSeats) : '')
  const [visibility, setVisibility] = useState<Vehicle['visibility']>(vehicle?.visibility ?? 'public')
  const [isAvailableForRental, setIsAvailableForRental] = useState(vehicle?.isAvailableForRental ?? false)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(vehicle?.features ?? [])
  const [errors, setErrors] = useState<FormErrors>({})

  // Mutation
  const mutation = useMutation({
    mutationFn: (data: CreateVehicleData) => {
      if (isEdit && vehicle) {
        return vehiclesApi.update(vehicle.id, data)
      }
      return vehiclesApi.create(data)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      if (isEdit && vehicle) {
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle.id] })
      }
      onSuccess(res.data)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        const fieldErrors: FormErrors = {}
        for (const detail of err.details) {
          fieldErrors[detail.field as keyof FormErrors] = detail.message
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ root: err instanceof Error ? err.message : 'An unexpected error occurred.' })
      }
    },
  })

  function toggleFeature(val: string) {
    setSelectedFeatures((prev) =>
      prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]
    )
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!brand.trim()) errs.brand = 'Brand is required.'
    if (!model.trim()) errs.model = 'Model is required.'
    if (!color.trim()) errs.color = 'Color is required.'
    if (!plateNumber.trim()) errs.plateNumber = 'Plate number is required.'
    if (!totalSeats.trim()) errs.totalSeats = 'Total seats is required.'
    else if (isNaN(Number(totalSeats)) || Number(totalSeats) < 1) {
      errs.totalSeats = 'Must be a positive number.'
    }
    if (year && (isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1)) {
      errs.year = 'Enter a valid year.'
    }
    return errs
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    mutation.mutate({
      type,
      brand: brand.trim(),
      model: model.trim(),
      year: year ? Number(year) : undefined,
      color: color.trim(),
      plateNumber: plateNumber.trim().toUpperCase(),
      totalSeats: Number(totalSeats),
      visibility,
      isAvailableForRental,
      features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Root error */}
      {errors.root && (
        <div className="rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
          {errors.root}
        </div>
      )}

      {/* ── Main fields ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Type */}
        <FormField>
          <FormLabel htmlFor="type" required>Type</FormLabel>
          <div className="relative">
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as Vehicle['type'])}
              className={selectClass}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <FormError>{errors.type}</FormError>
        </FormField>

        {/* Visibility */}
        <FormField>
          <FormLabel htmlFor="visibility" required>Visibility</FormLabel>
          <div className="relative">
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Vehicle['visibility'])}
              className={selectClass}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </FormField>

        {/* Brand */}
        <FormField>
          <FormLabel htmlFor="brand" required>Brand</FormLabel>
          <TextInput
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Toyota"
            error={errors.brand}
          />
        </FormField>

        {/* Model */}
        <FormField>
          <FormLabel htmlFor="model" required>Model</FormLabel>
          <TextInput
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Hiace"
            error={errors.model}
          />
        </FormField>

        {/* Year */}
        <FormField>
          <FormLabel htmlFor="year">Year</FormLabel>
          <TextInput
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder={`e.g. ${new Date().getFullYear()}`}
            min={1900}
            max={new Date().getFullYear() + 1}
            error={errors.year}
          />
        </FormField>

        {/* Color */}
        <FormField>
          <FormLabel htmlFor="color" required>Color</FormLabel>
          <TextInput
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g. White"
            error={errors.color}
          />
        </FormField>

        {/* Plate number */}
        <FormField>
          <FormLabel htmlFor="plateNumber" required>Plate Number</FormLabel>
          <TextInput
            id="plateNumber"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            placeholder="e.g. KIN-1234-A"
            className="font-mono uppercase"
            error={errors.plateNumber}
          />
        </FormField>

        {/* Total seats */}
        <FormField>
          <FormLabel htmlFor="totalSeats" required>Total Seats</FormLabel>
          <TextInput
            id="totalSeats"
            type="number"
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            placeholder="e.g. 18"
            min={1}
            max={200}
            error={errors.totalSeats}
          />
        </FormField>
      </div>

      {/* ── Available for rental ─────────────────────────────────────────────── */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={isAvailableForRental}
            onChange={(e) => setIsAvailableForRental(e.target.checked)}
            className="peer sr-only"
            id="isAvailableForRental"
          />
          <div className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-100',
            isAvailableForRental
              ? 'bg-[#0A7AFF] border-[#0A7AFF]'
              : 'bg-white dark:bg-[#111827] border-[#D1D5DB] dark:border-[#4B5563]'
          )}>
            {isAvailableForRental && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
            Available for rental
          </span>
          <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
            Allow this vehicle to be rented by other operators.
          </p>
        </div>
      </label>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <FormField>
        <FormLabel>Features</FormLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {FEATURES.map((feature) => {
            const checked = selectedFeatures.includes(feature.value)
            return (
              <label
                key={feature.value}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors duration-100',
                  checked
                    ? 'border-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 text-[#0A7AFF]'
                    : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937]'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFeature(feature.value)}
                  className="sr-only"
                />
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  checked ? 'bg-[#0A7AFF] border-[#0A7AFF]' : 'border-[#D1D5DB] dark:border-[#4B5563]'
                )}>
                  {checked && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{feature.label}</span>
              </label>
            )
          })}
        </div>
      </FormField>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F3F4F6] dark:border-[#2C2C2E]">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={mutation.isPending}
        >
          {isEdit ? 'Save changes' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  )
}
