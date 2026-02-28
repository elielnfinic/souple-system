'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { bookingsApi } from '@/lib/api/trips'
import type { Booking, Payment, ReceiptData } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'
import { paymentsApi } from '@/lib/api/payments'
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector'
import { MobileMoneyForm } from '@/components/payments/MobileMoneyForm'
import { CashPaymentForm } from '@/components/payments/CashPaymentForm'
import { PaymentReceipt } from '@/components/payments/PaymentReceipt'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Résumé', 'Paiement', 'Confirmation']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const isDone = i < current
        const isActive = i === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200',
                  isDone
                    ? 'bg-[#16A34A] text-white'
                    : isActive
                    ? 'bg-[#0A7AFF] text-white'
                    : 'bg-[#E5E7EB] dark:bg-[#374151] text-[#9CA3AF]'
                )}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-[#0A7AFF]' : 'text-[#9CA3AF] dark:text-[#6B7280]'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mb-5 transition-colors duration-200',
                  isDone ? 'bg-[#16A34A]' : 'bg-[#E5E7EB] dark:bg-[#374151]'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Booking summary card ──────────────────────────────────────────────────────

function BookingSummary({ booking }: { booking: Booking }) {
  const boardingName = booking.boardingStop?.city?.name ?? `Arrêt ${booking.boardingStopOrder}`
  const alightingName = booking.alightingStop?.city?.name ?? `Arrêt ${booking.alightingStopOrder}`

  return (
    <div className="rounded-xl border border-[#E5E7EB] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] divide-y divide-[#F3F4F6] dark:divide-[#2C2C2E]">
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
          Réservation
        </p>
        <p className="mt-0.5 text-sm font-bold text-[#111827] dark:text-[#F9FAFB] font-mono">
          {booking.bookingCode}
        </p>
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">{boardingName}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#9CA3AF] shrink-0">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">{alightingName}</span>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          {booking.seatCount} siège{booking.seatCount > 1 ? 's' : ''}
          {booking.seats && booking.seats.length > 0 && (
            <span className="ml-1 text-xs">
              ({booking.seats.map((s) => s.tripSeat?.seatIdentifier ?? '—').join(', ')})
            </span>
          )}
        </span>
        <span className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          {formatCurrency(booking.totalAmount, booking.currency as SupportedCurrency)}
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'fr'
  const bookingId = Number(params?.id)

  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)

  // Load booking
  const { data: bookingRes, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getBooking(bookingId),
    enabled: !isNaN(bookingId),
  })

  const booking = bookingRes?.data

  function handleMethodSelect(method: string, provider: string) {
    setSelectedMethod(method)
    setSelectedProvider(provider)
  }

  function handleProceedToPayment() {
    if (!selectedMethod || !selectedProvider) {
      toast({ variant: 'warning', title: 'Sélectionnez un mode de paiement' })
      return
    }
    setStep(1)
  }

  async function handlePaymentSuccess(payment: Payment) {
    setCompletedPayment(payment)
    setStep(2)

    // Load receipt
    setIsLoadingReceipt(true)
    try {
      const res = await paymentsApi.receipt(payment.id)
      setReceipt(res.data)
    } catch {
      // Receipt failure is non-blocking
    } finally {
      setIsLoadingReceipt(false)
    }
  }

  function handlePaymentError(msg: string) {
    toast({ variant: 'danger', title: 'Erreur de paiement', description: msg })
  }

  // Error / loading states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0A7AFF] border-t-transparent" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[#DC2626] font-medium">Réservation introuvable.</p>
        <Button variant="secondary" size="sm" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      {/* Back */}
      <Link
        href={`/${locale}/dashboard/bookings`}
        className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] mb-6 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour aux réservations
      </Link>

      <h1 className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-6">
        Paiement
      </h1>

      <StepIndicator current={step} />

      {/* ── Step 0: Summary + Method selection ─────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-3">
              Récapitulatif
            </h2>
            <BookingSummary booking={booking} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-3">
              Mode de paiement
            </h2>
            <PaymentMethodSelector
              amount={booking.totalAmount}
              currency={booking.currency}
              onSelect={handleMethodSelect}
            />
          </section>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleProceedToPayment}
            disabled={!selectedMethod || !selectedProvider}
          >
            Continuer
          </Button>
        </div>
      )}

      {/* ── Step 1: Payment form ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">
              {selectedMethod === 'mobile_money'
                ? 'Mobile Money'
                : selectedMethod === 'card'
                ? 'Carte bancaire'
                : selectedMethod === 'cash'
                ? 'Espèces'
                : 'Crypto'}
            </h2>
            <button
              onClick={() => setStep(0)}
              className="text-xs text-[#0A7AFF] hover:underline"
            >
              Changer
            </button>
          </div>

          {selectedMethod === 'mobile_money' && (
            <MobileMoneyForm
              amount={booking.totalAmount}
              currency={booking.currency}
              bookingId={booking.id}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}

          {selectedMethod === 'card' && (
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1C1C1E] p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#2C2C2E] flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" className="text-[#6B7280]">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                  Paiement par carte (Stripe)
                </p>
                <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  Montant : {formatCurrency(booking.totalAmount, booking.currency as SupportedCurrency)}
                </p>
                <p className="mt-3 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  L'intégration Stripe.js sera disponible dans la prochaine version.
                </p>
              </div>
            </div>
          )}

          {selectedMethod === 'cash' && (
            <CashPaymentForm
              bookingId={booking.id}
              amount={booking.totalAmount}
              currency={booking.currency}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {selectedMethod === 'stablecoin' && (
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1C1C1E] p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#2C2C2E] flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" className="text-[#6B7280]">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v12M9 9h4.5a2.5 2.5 0 010 5H9m0 0h4.5a2.5 2.5 0 010 5H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                  Paiement Stablecoin (USDT/USDC)
                </p>
                <p className="mt-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  En cours de développement — disponible prochainement.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Success ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {receipt ? (
            <PaymentReceipt receipt={receipt} />
          ) : isLoadingReceipt ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0A7AFF] border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-xl border border-[#DCFCE7] dark:border-[#14532D] bg-[#F0FDF4] dark:bg-[#14532D]/20 px-5 py-6 text-center space-y-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#16A34A] mx-auto">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-base font-bold text-[#16A34A]">Paiement réussi !</p>
              <p className="text-sm text-[#374151] dark:text-[#D1D5DB]">
                Réservation : <span className="font-mono font-semibold">{booking.bookingCode}</span>
              </p>
            </div>
          )}

          <Link
            href={`/${locale}/dashboard/bookings`}
            className="block"
          >
            <Button variant="secondary" size="md" fullWidth>
              Voir mes réservations
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
