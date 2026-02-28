'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Grid3x3, X, Check } from 'lucide-react'
import { priceRulesApi } from '@/lib/api/trips'
import { ApiError, routesApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { FormField, FormLabel, FormError, TextInput } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'
import type { PriceRule } from '@/lib/types'
import type { CreatePriceRuleData, PriceMatrixCell } from '@/lib/api/trips'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string): string {
  if (currency === 'CDF') return `${amount.toLocaleString('fr-CD')} FC`
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ─── Select class ─────────────────────────────────────────────────────────────

const selectClass = cn(
  'w-full h-10 rounded-md border border-[#D1D5DB] dark:border-[#4B5563]',
  'bg-white dark:bg-[#111827]',
  'text-base text-[#111827] dark:text-[#F9FAFB]',
  'px-3 appearance-none pr-8',
  'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
  'transition-colors duration-100'
)

// ─── Price rule columns ───────────────────────────────────────────────────────

const PRICE_MODES: Record<string, string> = {
  fixed: 'Fixe',
  per_segment: 'Par segment',
  per_km: 'Par km',
}

function buildColumns(
  onDelete: (id: number) => void,
  deletingId: number | null
): Column<PriceRule>[] {
  return [
    {
      key: 'routeId',
      header: 'Itinéraire',
      render: (row) => (
        <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
          Route #{row.routeId}
        </span>
      ),
    },
    {
      key: 'fromStopOrder',
      header: 'Segment',
      render: (row) => (
        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          {row.fromStopOrder != null && row.toStopOrder != null
            ? `Arrêt ${row.fromStopOrder} → ${row.toStopOrder}`
            : 'Trajet complet'}
        </span>
      ),
    },
    {
      key: 'priceMode',
      header: 'Mode',
      render: (row) => (
        <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
          {PRICE_MODES[row.priceMode] ?? row.priceMode}
        </span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Prix de base',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-semibold text-[#111827] dark:text-[#F9FAFB]">
          {formatPrice(row.basePrice, row.currency)}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Statut',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => onDelete(row.id)}
          disabled={deletingId === row.id}
          className="text-xs text-[#DC2626] hover:underline disabled:opacity-50"
        >
          {deletingId === row.id ? '...' : 'Supprimer'}
        </button>
      ),
    },
  ]
}

// ─── Add rule modal ───────────────────────────────────────────────────────────

interface AddRuleModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddRuleModal({ onClose, onSuccess }: AddRuleModalProps) {
  const [routeId, setRouteId] = useState<number>(0)
  const [fromStopOrder, setFromStopOrder] = useState('')
  const [toStopOrder, setToStopOrder] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [currency, setCurrency] = useState('CDF')
  const [priceMode, setPriceMode] = useState<PriceRule['priceMode']>('fixed')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: routesRes } = useQuery({
    queryKey: ['routes', 'all'],
    queryFn: () => routesApi.list({ perPage: 100 }) as Promise<{ data: Array<{ id: number; fromCity?: { name: string }; toCity?: { name: string } }> }>,
  })
  const routes = routesRes?.data ?? []

  const mutation = useMutation({
    mutationFn: () => {
      const data: CreatePriceRuleData = {
        routeId,
        fromStopOrder: fromStopOrder ? Number(fromStopOrder) : undefined,
        toStopOrder: toStopOrder ? Number(toStopOrder) : undefined,
        basePrice: Number(basePrice),
        currency,
        priceMode,
        isActive,
      }
      return priceRulesApi.create(data)
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        const errs: Record<string, string> = {}
        for (const d of err.details) errs[d.field] = d.message
        setErrors(errs)
      } else {
        setErrors({ root: err instanceof Error ? err.message : 'Erreur inattendue.' })
      }
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!routeId) errs.routeId = 'Sélectionnez un itinéraire.'
    if (!basePrice || isNaN(Number(basePrice)) || Number(basePrice) <= 0)
      errs.basePrice = 'Entrez un prix valide.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-2xl p-6 w-full max-w-[480px] mx-4 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Ajouter une règle tarifaire
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.root && (
            <div className="rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] dark:border-[#991B1B] px-4 py-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">
              {errors.root}
            </div>
          )}

          <FormField>
            <FormLabel htmlFor="rule-route" required>Itinéraire</FormLabel>
            <div className="relative">
              <select
                id="rule-route"
                value={routeId}
                onChange={(e) => setRouteId(Number(e.target.value))}
                className={selectClass}
              >
                <option value={0} disabled>Sélectionner...</option>
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

          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <FormLabel htmlFor="from-stop">Arrêt de (ordre)</FormLabel>
              <TextInput
                id="from-stop"
                type="number"
                value={fromStopOrder}
                onChange={(e) => setFromStopOrder(e.target.value)}
                placeholder="ex: 0"
                min={0}
              />
            </FormField>
            <FormField>
              <FormLabel htmlFor="to-stop">Arrêt à (ordre)</FormLabel>
              <TextInput
                id="to-stop"
                type="number"
                value={toStopOrder}
                onChange={(e) => setToStopOrder(e.target.value)}
                placeholder="ex: 3"
                min={1}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <FormLabel htmlFor="rule-price" required>Prix de base</FormLabel>
              <TextInput
                id="rule-price"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="ex: 5000"
                min={0}
                error={errors.basePrice}
              />
            </FormField>
            <FormField>
              <FormLabel htmlFor="rule-currency">Devise</FormLabel>
              <div className="relative">
                <select
                  id="rule-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={selectClass}
                >
                  <option value="CDF">CDF (FC)</option>
                  <option value="USD">USD ($)</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </FormField>
          </div>

          <FormField>
            <FormLabel htmlFor="rule-mode">Mode de tarification</FormLabel>
            <div className="relative">
              <select
                id="rule-mode"
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value as PriceRule['priceMode'])}
                className={selectClass}
              >
                <option value="fixed">Fixe</option>
                <option value="per_segment">Par segment</option>
                <option value="per_km">Par kilomètre</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </FormField>

          <label className="flex items-center gap-2 cursor-pointer">
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-100 shrink-0',
              isActive ? 'bg-[#0A7AFF] border-[#0A7AFF]' : 'bg-white dark:bg-[#111827] border-[#D1D5DB] dark:border-[#4B5563]'
            )}>
              {isActive && <Check size={11} className="text-white" />}
            </div>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only" />
            <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Règle active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#F3F4F6] dark:border-[#2C2C2E]">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" loading={mutation.isPending}>
              Ajouter la règle
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Price matrix modal ───────────────────────────────────────────────────────

interface PriceMatrixModalProps {
  routeId: number
  onClose: () => void
}

function PriceMatrixModal({ routeId, onClose }: PriceMatrixModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['price-matrix', routeId],
    queryFn: () => priceRulesApi.getMatrix(routeId),
    enabled: !!routeId,
  })

  const matrix: PriceMatrixCell[][] = data?.data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-2xl p-6 w-full max-w-[640px] mx-4 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Matrice tarifaire — Route #{routeId}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-[#9CA3AF] animate-pulse">Chargement de la matrice...</div>
        ) : matrix.length === 0 ? (
          <div className="text-center py-8 text-[#9CA3AF]">Aucune règle configurée pour cet itinéraire.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#E5E7EB] dark:border-[#374151] px-3 py-2 bg-[#F9FAFB] dark:bg-[#111827] text-[#374151] dark:text-[#D1D5DB] font-semibold text-left">
                    De \ Vers
                  </th>
                  {matrix[0]?.map((cell) => (
                    <th key={cell.toStopOrder} className="border border-[#E5E7EB] dark:border-[#374151] px-3 py-2 bg-[#F9FAFB] dark:bg-[#111827] text-[#374151] dark:text-[#D1D5DB] font-semibold text-center whitespace-nowrap">
                      Arrêt {cell.toStopOrder}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, ri) => (
                  <tr key={ri}>
                    <td className="border border-[#E5E7EB] dark:border-[#374151] px-3 py-2 bg-[#F9FAFB] dark:bg-[#111827] font-semibold text-[#374151] dark:text-[#D1D5DB] whitespace-nowrap">
                      Arrêt {row[0]?.fromStopOrder}
                    </td>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          'border border-[#E5E7EB] dark:border-[#374151] px-3 py-2 text-center tabular-nums',
                          cell.price === 0
                            ? 'text-[#D1D5DB] dark:text-[#4B5563] bg-[#F9FAFB] dark:bg-[#111827]'
                            : 'text-[#111827] dark:text-[#F9FAFB] font-medium'
                        )}
                      >
                        {cell.price === 0 ? '—' : formatPrice(cell.price, cell.currency)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricesPage() {
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [matrixRouteId, setMatrixRouteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [routeFilter, setRouteFilter] = useState<number>(0)
  const [page, setPage] = useState(1)

  const { data: routesRes } = useQuery({
    queryKey: ['routes', 'all'],
    queryFn: () => routesApi.list({ perPage: 100 }) as Promise<{ data: Array<{ id: number; fromCity?: { name: string }; toCity?: { name: string } }> }>,
  })
  const routes = routesRes?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['price-rules', routeFilter, page],
    queryFn: () =>
      priceRulesApi.list({
        routeId: routeFilter || undefined,
        page,
        perPage: 20,
      }),
  })

  const rules = data?.data ?? []
  const total = data?.meta.total ?? 0

  const deleteMutation = useMutation({
    mutationFn: (id: number) => priceRulesApi.delete(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-rules'] }),
  })

  const columns = buildColumns(
    (id) => { if (window.confirm('Supprimer cette règle tarifaire ?')) deleteMutation.mutate(id) },
    deletingId
  )

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Tarifs
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
            {total} règle{total !== 1 ? 's' : ''} tarifaire{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {routeFilter > 0 && (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Grid3x3 size={14} />}
              onClick={() => setMatrixRouteId(routeFilter)}
            >
              Matrice
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setShowAddModal(true)}
          >
            Ajouter une règle
          </Button>
        </div>
      </div>

      {/* ── Route filter ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <select
            value={routeFilter}
            onChange={(e) => { setRouteFilter(Number(e.target.value)); setPage(1) }}
            className={cn(
              'h-9 rounded-lg border border-[#D1D5DB] dark:border-[#4B5563]',
              'bg-white dark:bg-[#111827]',
              'text-sm text-[#111827] dark:text-[#F9FAFB]',
              'px-3 appearance-none pr-7',
              'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
            )}
          >
            <option value={0}>Tous les itinéraires</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fromCity?.name ?? '?'} → {r.toCity?.name ?? '?'}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        {routeFilter > 0 && (
          <button
            type="button"
            onClick={() => { setRouteFilter(0); setPage(1) }}
            className="text-xs text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB] underline"
          >
            Effacer le filtre
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <DataTable<PriceRule>
          columns={columns}
          data={rules}
          rowKey={(r) => r.id}
          loading={isLoading}
          emptyMessage="Aucune règle tarifaire. Commencez par en ajouter une."
          totalRows={total}
          page={page}
          onPageChange={setPage}
          pageSize={20}
        />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddRuleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['price-rules'] })}
        />
      )}

      {matrixRouteId != null && (
        <PriceMatrixModal
          routeId={matrixRouteId}
          onClose={() => setMatrixRouteId(null)}
        />
      )}
    </div>
  )
}
