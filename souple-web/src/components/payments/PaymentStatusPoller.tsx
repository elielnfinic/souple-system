'use client'

import { useEffect, useRef, useState } from 'react'
import { paymentsApi } from '@/lib/api/payments'
import type { Payment } from '@/lib/types'
import { Button } from '@/components/ui/button'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentStatusPollerProps {
  paymentId: number
  onComplete: (payment: Payment) => void
  onFail: (payment: Payment) => void
}

type PollerState = 'polling' | 'completed' | 'failed' | 'timeout'

// ─── Poll interval and timeout ─────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3000
const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // 10 minutes

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentStatusPoller({ paymentId, onComplete, onFail }: PaymentStatusPollerProps) {
  const [state, setState] = useState<PollerState>('polling')
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())
  const isMounted = useRef(true)

  async function checkStatus() {
    try {
      const res = await paymentsApi.status(paymentId)
      if (!isMounted.current) return

      const { status, payment } = res.data

      if (status === 'completed') {
        stopPolling()
        setState('completed')
        setTimeout(() => onComplete(payment), 1200)
      } else if (status === 'failed') {
        stopPolling()
        setState('failed')
        setTimeout(() => onFail(payment), 1200)
      }

      // Check timeout
      if (Date.now() - startTimeRef.current > MAX_POLL_DURATION_MS) {
        stopPolling()
        setState('timeout')
      }
    } catch {
      // Silently swallow poll errors — retry on next tick
    }
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function startPolling() {
    stopPolling()
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + POLL_INTERVAL_MS)
      checkStatus()
    }, POLL_INTERVAL_MS)
  }

  useEffect(() => {
    isMounted.current = true
    startTimeRef.current = Date.now()
    checkStatus() // immediate first check
    startPolling()

    return () => {
      isMounted.current = false
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId])

  // Elapsed time display (mm:ss)
  const elapsedSec = Math.floor(elapsed / 1000)
  const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0')
  const secs = (elapsedSec % 60).toString().padStart(2, '0')

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      {state === 'polling' && (
        <>
          {/* Animated spinner */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#E5E7EB] dark:border-[#374151]" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#0A7AFF] animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
              En attente de confirmation...
            </p>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Confirmez le paiement sur votre téléphone
            </p>
            <p className="mt-2 text-xs text-[#9CA3AF] dark:text-[#6B7280] tabular-nums">
              {mins}:{secs}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkStatus()}
          >
            Vérifier manuellement
          </Button>
        </>
      )}

      {state === 'completed' && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#DCFCE7] dark:bg-[#14532D]/40 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#16A34A]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#16A34A]">Paiement réussi !</p>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Votre paiement a été confirmé avec succès.
            </p>
          </div>
        </>
      )}

      {state === 'failed' && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#FEE2E2] dark:bg-[#450A0A]/40 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#DC2626]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#DC2626]">Paiement échoué</p>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Le paiement n'a pas pu être traité. Veuillez réessayer.
            </p>
          </div>
        </>
      )}

      {state === 'timeout' && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#FEF3C7] dark:bg-[#451A03]/40 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#F59E0B]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#F59E0B]">Délai dépassé</p>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Le délai d'attente a expiré. Vérifiez votre téléphone.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setState('polling')
              startTimeRef.current = Date.now()
              setElapsed(0)
              startPolling()
            }}
          >
            Vérifier manuellement
          </Button>
        </>
      )}
    </div>
  )
}
