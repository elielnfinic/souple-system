'use client'

import { useState } from 'react'
import { paymentsApi } from '@/lib/api/payments'
import type { Payment } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel, FormError, TextInput } from '@/components/ui/form-field'
import { PaymentStatusPoller } from './PaymentStatusPoller'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'

// ─── Provider options ──────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: 'mtn', label: 'MTN MoMo' },
  { id: 'orange', label: 'Orange Money' },
  { id: 'airtel', label: 'Airtel Money' },
]

const selectClass = cn(
  'w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-base text-[#111827] dark:text-[#F9FAFB]',
  'px-3 appearance-none pr-8',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
  'transition-colors duration-100'
)

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileMoneyFormProps {
  amount: number
  currency: string
  bookingId?: number
  fleetBookingId?: number
  onSuccess: (payment: Payment) => void
  onError: (msg: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileMoneyForm({
  amount,
  currency,
  bookingId,
  fleetBookingId,
  onSuccess,
  onError,
}: MobileMoneyFormProps) {
  const [phone, setPhone] = useState('')
  const [provider, setProvider] = useState('mtn')
  const [phoneError, setPhoneError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initiatedPaymentId, setInitiatedPaymentId] = useState<number | null>(null)

  function validate(): boolean {
    if (!phone.trim()) {
      setPhoneError('Le numéro de téléphone est requis.')
      return false
    }
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 9) {
      setPhoneError('Entrez un numéro de téléphone valide.')
      return false
    }
    setPhoneError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await paymentsApi.initiate({
        bookingId,
        fleetBookingId,
        amount,
        currency,
        method: 'mobile_money',
        provider,
        customerPhone: phone.trim(),
      })
      setInitiatedPaymentId(res.data.payment.id)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Une erreur est survenue. Veuillez réessayer.'
      onError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // After initiation — show poller
  if (initiatedPaymentId !== null) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1C1C1E] p-6">
        <PaymentStatusPoller
          paymentId={initiatedPaymentId}
          onComplete={onSuccess}
          onFail={(payment) => onError(`Paiement ${payment.id} échoué.`)}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Amount summary */}
      <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">Montant à payer</span>
        <span className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          {formatCurrency(amount, currency as SupportedCurrency)}
        </span>
      </div>

      {/* Provider */}
      <FormField>
        <FormLabel htmlFor="mm-provider" required>
          Opérateur
        </FormLabel>
        <div className="relative">
          <select
            id="mm-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={selectClass}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
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

      {/* Phone */}
      <FormField>
        <FormLabel htmlFor="mm-phone" required>
          Numéro de téléphone
        </FormLabel>
        <TextInput
          id="mm-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+243 812 345 678"
          error={phoneError}
        />
        <FormError>{phoneError}</FormError>
      </FormField>

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        loading={isSubmitting}
      >
        Payer via Mobile Money
      </Button>
    </form>
  )
}
