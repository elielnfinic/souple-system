'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { paymentsApi } from '@/lib/api/payments'
import type { Payment, PaymentTransaction, ReceiptData } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { PaymentReceipt } from '@/components/payments/PaymentReceipt'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'

// ─── Status maps ──────────────────────────────────────────────────────────────

const PAYMENT_STATUS_MAP: Record<Payment['status'], string> = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
  partially_refunded: 'refunded',
}

const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
  partially_refunded: 'Partiellement remboursé',
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
  stripe: 'Stripe',
  cash: 'Espèces',
  stablecoin: 'Crypto (USDT/USDC)',
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn: 'MTN MoMo',
  orange: 'Orange Money',
  airtel: 'Airtel Money',
  stripe: 'Stripe',
  cash: 'Cash',
  crypto: 'Stablecoin',
}

const TX_TYPE_LABELS: Record<PaymentTransaction['type'], string> = {
  charge: 'Débit',
  refund: 'Remboursement',
  payout: 'Virement',
}

const TX_STATUS_MAP: Record<PaymentTransaction['status'], string> = {
  pending: 'pending',
  success: 'completed',
  failed: 'failed',
}

const TX_STATUS_LABELS: Record<PaymentTransaction['status'], string> = {
  pending: 'En attente',
  success: 'Réussi',
  failed: 'Échoué',
}

// ─── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#F3F4F6] dark:border-[#2C2C2E] last:border-0">
      <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] shrink-0">{label}</span>
      <div className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] text-right">
        {children}
      </div>
    </div>
  )
}

// ─── Transaction columns ───────────────────────────────────────────────────────

const TX_COLUMNS: Column<PaymentTransaction>[] = [
  {
    key: 'createdAt',
    header: 'Date',
    render: (row) => (
      <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] tabular-nums whitespace-nowrap">
        {new Date(row.createdAt).toLocaleString('fr-CD', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (row) => (
      <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
        {TX_TYPE_LABELS[row.type] ?? row.type}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Montant',
    align: 'right',
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums text-[#111827] dark:text-[#F9FAFB]">
        {formatCurrency(row.amount, row.currency as SupportedCurrency)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Statut',
    align: 'center',
    render: (row) => (
      <StatusBadge
        status={TX_STATUS_MAP[row.status] ?? row.status}
        label={TX_STATUS_LABELS[row.status] ?? row.status}
      />
    ),
  },
  {
    key: 'providerReference',
    header: 'Référence',
    render: (row) => (
      <span className="text-xs font-mono text-[#9CA3AF] dark:text-[#6B7280]">
        {row.providerReference ?? '—'}
      </span>
    ),
  },
  {
    key: 'errorMessage',
    header: 'Erreur',
    render: (row) => (
      <span className="text-xs text-[#DC2626] dark:text-[#FCA5A5]">
        {row.errorMessage ?? ''}
      </span>
    ),
  },
]

// ─── Refund form ──────────────────────────────────────────────────────────────

function RefundForm({
  payment,
  onSuccess,
}: {
  payment: Payment
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      paymentsApi.refund(payment.id, amount ? Number(amount) : undefined),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Remboursement initié avec succès.' })
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] })
      onSuccess()
    },
    onError: (err) => {
      toast({
        variant: 'danger',
        title: 'Erreur',
        description:
          err instanceof ApiError ? err.message : 'Une erreur est survenue.',
      })
    },
  })

  return (
    <div className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#FFFBEB] dark:bg-[#451A03]/20 p-4 space-y-3">
      <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">
        Initier un remboursement
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Laisser vide = total (${formatCurrency(payment.amount, payment.currency as SupportedCurrency)})`}
          min={1}
          max={payment.amount}
          className={cn(
            'flex-1 h-9 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563]',
            'bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB]',
            'px-3 focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
          )}
        />
        <Button
          variant="danger"
          size="sm"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Rembourser
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'fr'
  const paymentId = Number(params?.id)

  const [showRefund, setShowRefund] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  // Load payment
  const { data: paymentRes, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentsApi.get(paymentId),
    enabled: !isNaN(paymentId),
  })

  const payment = paymentRes?.data

  async function handleViewReceipt() {
    if (receipt) {
      setShowReceipt(true)
      return
    }
    setIsLoadingReceipt(true)
    try {
      const res = await paymentsApi.receipt(paymentId)
      setReceipt(res.data)
      setShowReceipt(true)
    } catch {
      // Silent — receipt unavailable
    } finally {
      setIsLoadingReceipt(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0A7AFF] border-t-transparent" />
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[#DC2626] font-medium">Paiement introuvable.</p>
        <Button variant="secondary" size="sm" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/dashboard/payments`}
            className="text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
            aria-label="Retour aux paiements"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
              Paiement #{payment.id}
            </h1>
            <div className="mt-1">
              <StatusBadge
                status={PAYMENT_STATUS_MAP[payment.status] ?? payment.status}
                label={PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {payment.status === 'completed' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                loading={isLoadingReceipt}
                onClick={handleViewReceipt}
              >
                Voir le reçu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRefund((v) => !v)}
              >
                Rembourser
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Receipt modal ────────────────────────────────────────────────────── */}
      {showReceipt && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <PaymentReceipt receipt={receipt} />
          </div>
        </div>
      )}

      {/* ── Refund form ──────────────────────────────────────────────────────── */}
      {showRefund && (
        <RefundForm payment={payment} onSuccess={() => setShowRefund(false)} />
      )}

      {/* ── Payment info card ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
        <h2 className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-3">
          Informations
        </h2>
        <div>
          {payment.bookingId && (
            <InfoRow label="Réservation">
              <Link
                href={`/${locale}/dashboard/bookings/${payment.bookingId}`}
                className="text-[#0A7AFF] hover:underline"
              >
                #{payment.bookingId}
              </Link>
            </InfoRow>
          )}
          <InfoRow label="Montant">
            <span className="text-base font-bold">
              {formatCurrency(payment.amount, payment.currency as SupportedCurrency)}
            </span>
          </InfoRow>
          <InfoRow label="Méthode">
            {METHOD_LABELS[payment.method] ?? payment.method}
          </InfoRow>
          {payment.provider && (
            <InfoRow label="Fournisseur">
              {PROVIDER_LABELS[payment.provider] ?? payment.provider}
            </InfoRow>
          )}
          {payment.phoneNumber && (
            <InfoRow label="Téléphone">
              <span className="font-mono">{payment.phoneNumber}</span>
            </InfoRow>
          )}
          {payment.externalTransactionId && (
            <InfoRow label="ID transaction">
              <span className="font-mono text-xs">{payment.externalTransactionId}</span>
            </InfoRow>
          )}
          {payment.paidAt && (
            <InfoRow label="Payé le">
              {new Date(payment.paidAt).toLocaleString('fr-CD', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </InfoRow>
          )}
          {payment.refundedAt && (
            <InfoRow label="Remboursé le">
              {new Date(payment.refundedAt).toLocaleString('fr-CD', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </InfoRow>
          )}
          {payment.refundAmount != null && (
            <InfoRow label="Montant remboursé">
              {formatCurrency(payment.refundAmount, payment.currency as SupportedCurrency)}
            </InfoRow>
          )}
          <InfoRow label="Créé le">
            {new Date(payment.createdAt).toLocaleString('fr-CD', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </InfoRow>
        </div>
      </div>

      {/* ── Transaction log ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
        <h2 className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-4">
          Journal des transactions
        </h2>
        <DataTable<PaymentTransaction>
          columns={TX_COLUMNS}
          data={[]}
          rowKey={(r) => r.id}
          loading={false}
          emptyMessage="Aucune transaction enregistrée."
          pageSize={10}
        />
      </div>
    </div>
  )
}
