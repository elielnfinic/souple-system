'use client'

import type { ReceiptData } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentReceiptProps {
  receipt: ReceiptData
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 border-t border-dashed border-[#D1D5DB] dark:border-[#374151]" />
      <span className="text-[#9CA3AF] dark:text-[#6B7280]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <div className="flex-1 border-t border-dashed border-[#D1D5DB] dark:border-[#374151]" />
    </div>
  )
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] shrink-0">{label}</span>
      <span
        className={cn(
          'text-sm text-right text-[#111827] dark:text-[#F9FAFB] font-medium',
          mono && 'font-mono'
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentReceipt({ receipt }: PaymentReceiptProps) {
  function handlePrint() {
    window.print()
  }

  async function handleShare() {
    const text = [
      `Reçu Souple — ${receipt.receiptNumber}`,
      `Passager : ${receipt.passengerName}`,
      `Trajet : ${receipt.route}`,
      `Montée : ${receipt.boardingStop} → Descente : ${receipt.alightingStop}`,
      `Sièges : ${receipt.seats.join(', ')}`,
      `Montant : ${formatCurrency(receipt.amount, receipt.currency as SupportedCurrency)}`,
      `Méthode : ${receipt.paymentMethod}`,
      `Réf : ${receipt.paymentReference}`,
      `Code réservation : ${receipt.bookingCode}`,
      `Date : ${receipt.date}`,
    ].join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: `Reçu ${receipt.receiptNumber}`, text })
      } catch {
        // User cancelled or share not supported
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Silently fail
      }
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      {/* Receipt card */}
      <div
        id="souple-receipt"
        className={cn(
          'bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="bg-[#0A7AFF] px-5 py-5 text-center">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">
            {receipt.orgName}
          </p>
          <p className="mt-1 text-white text-lg font-bold tracking-tight">
            REÇU DE PAIEMENT
          </p>
          <p className="mt-1 text-white/80 text-xs font-mono">{receipt.receiptNumber}</p>
        </div>

        {/* Notch cutouts */}
        <div className="relative h-0">
          <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-[#F9FAFB] dark:bg-[#111111]" />
          <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full bg-[#F9FAFB] dark:bg-[#111111]" />
        </div>

        {/* Body */}
        <div className="px-5 pt-5 pb-4 space-y-0">
          <Row label="Passager" value={receipt.passengerName} />
          <Row label="Code réservation" value={receipt.bookingCode} mono />

          <Divider />

          <Row label="Trajet" value={receipt.route} />
          <Row label="Montée" value={receipt.boardingStop} />
          <Row label="Descente" value={receipt.alightingStop} />
          <Row label="Sièges" value={receipt.seats.join(', ')} />

          <Divider />

          <Row label="Méthode" value={receipt.paymentMethod} />
          <Row label="Référence" value={receipt.paymentReference} mono />
          <Row label="Date" value={receipt.date} />

          {/* Amount highlight */}
          <div className="mt-4 rounded-xl bg-[#F0F7FF] dark:bg-[#0A7AFF]/10 border border-[#BFDBFE] dark:border-[#0A7AFF]/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">
              Total payé
            </span>
            <span className="text-lg font-bold text-[#0A7AFF]">
              {formatCurrency(receipt.amount, receipt.currency as SupportedCurrency)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 text-center">
          <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
            Merci de voyager avec {receipt.orgName}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          fullWidth
          leadingIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          }
          onClick={handlePrint}
        >
          Imprimer
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          leadingIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          }
          onClick={handleShare}
        >
          Partager
        </Button>
      </div>
    </div>
  )
}
