'use client'

import { useState } from 'react'
import { paymentsApi } from '@/lib/api/payments'
import type { Payment } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { FormField, FormLabel } from '@/components/ui/form-field'
import { ApiError } from '@/lib/api-client'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CashPaymentFormProps {
  bookingId: number
  amount: number
  currency: string
  onSuccess: (payment: Payment) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CashPaymentForm({ bookingId, amount, currency, onSuccess }: CashPaymentFormProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const res = await paymentsApi.cash({
        bookingId,
        amount,
        currency,
        notes: notes.trim() || undefined,
      })
      onSuccess(res.data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Une erreur est survenue. Veuillez réessayer.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Amount confirmation */}
      <div className="rounded-xl border-2 border-[#E5E7EB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#1F2937] px-5 py-4 text-center">
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">Montant à encaisser</p>
        <p className="mt-1.5 text-3xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
          {formatCurrency(amount, currency as SupportedCurrency)}
        </p>
        <p className="mt-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          Assurez-vous d'avoir reçu le montant exact en espèces.
        </p>
      </div>

      {/* Notes */}
      <FormField>
        <FormLabel htmlFor="cash-notes">Notes (optionnel)</FormLabel>
        <textarea
          id="cash-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques ou informations complémentaires..."
          rows={3}
          className={
            'w-full rounded-md border border-[#D1D5DB] dark:border-[#4B5563] ' +
            'bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB] ' +
            'placeholder:text-[#9CA3AF] px-3 py-2.5 resize-none ' +
            'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1 ' +
            'transition-colors duration-100'
          }
        />
      </FormField>

      {/* Root error */}
      {error && (
        <div className="rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="success"
        size="md"
        fullWidth
        loading={isSubmitting}
        leadingIcon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        }
      >
        Confirmer le paiement en espèces
      </Button>
    </form>
  )
}
