'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { SupportedCurrency } from '@/lib/format'

// ─── Method option card ────────────────────────────────────────────────────────

interface MethodOption {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  providers?: Array<{ id: string; label: string }>
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function BanknotesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M1 10h2M21 10h2M1 14h2M21 14h2" />
    </svg>
  )
}

function BitcoinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 3.912m5.908 1.042-.347 1.97M8.29 3.912l-.53 3.003M8.29 3.912l-3.94-.694" />
    </svg>
  )
}

// ─── Method definitions ────────────────────────────────────────────────────────

const METHODS: MethodOption[] = [
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    description: 'MTN, Orange, Airtel',
    icon: <PhoneIcon />,
    providers: [
      { id: 'mtn', label: 'MTN MoMo' },
      { id: 'orange', label: 'Orange Money' },
      { id: 'airtel', label: 'Airtel Money' },
    ],
  },
  {
    id: 'card',
    label: 'Carte bancaire',
    description: 'Visa, Mastercard via Stripe',
    icon: <CreditCardIcon />,
    providers: [{ id: 'stripe', label: 'Stripe' }],
  },
  {
    id: 'cash',
    label: 'Espèces',
    description: 'Paiement en caisse',
    icon: <BanknotesIcon />,
    providers: [{ id: 'cash', label: 'Cash' }],
  },
  {
    id: 'stablecoin',
    label: 'Crypto (USDT/USDC)',
    description: 'Stablecoin via wallet',
    icon: <BitcoinIcon />,
    providers: [{ id: 'crypto', label: 'Stablecoin' }],
  },
]

// ─── Sub-provider selector ────────────────────────────────────────────────────

interface ProviderButtonProps {
  label: string
  selected: boolean
  onClick: () => void
}

function ProviderButton({ label, selected, onClick }: ProviderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors duration-100',
        selected
          ? 'border-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 text-[#0A7AFF]'
          : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937]'
      )}
    >
      {label}
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentMethodSelectorProps {
  onSelect: (method: string, provider: string) => void
  amount: number
  currency: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentMethodSelector({ onSelect, amount, currency }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  function handleMethodClick(method: MethodOption) {
    const next = selectedMethod === method.id ? null : method.id
    setSelectedMethod(next)
    setSelectedProvider(null)
    // Auto-select provider if only one option
    if (next && method.providers && method.providers.length === 1) {
      const p = method.providers[0].id
      setSelectedProvider(p)
      onSelect(method.id, p)
    }
  }

  function handleProviderClick(methodId: string, providerId: string) {
    setSelectedProvider(providerId)
    onSelect(methodId, providerId)
  }

  return (
    <div className="space-y-4">
      {/* Amount display */}
      <div className="rounded-xl bg-[#F0F7FF] dark:bg-[#0A7AFF]/10 border border-[#BFDBFE] dark:border-[#0A7AFF]/30 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Montant</span>
        <span className="text-lg font-bold text-[#0A7AFF]">
          {formatCurrency(amount, currency as SupportedCurrency)}
        </span>
      </div>

      {/* Method cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METHODS.map((method) => {
          const isSelected = selectedMethod === method.id
          return (
            <div key={method.id}>
              <button
                type="button"
                onClick={() => handleMethodClick(method)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-150',
                  isSelected
                    ? 'border-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 ring-2 ring-[#0A7AFF]/30'
                    : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1C1C1E] hover:border-[#0A7AFF]/50 hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937]'
                )}
              >
                <span
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected
                      ? 'bg-[#0A7AFF] text-white'
                      : 'bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#374151] dark:text-[#D1D5DB]'
                  )}
                >
                  {method.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-semibold truncate',
                      isSelected
                        ? 'text-[#0A7AFF]'
                        : 'text-[#111827] dark:text-[#F9FAFB]'
                    )}
                  >
                    {method.label}
                  </p>
                  <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5 truncate">
                    {method.description}
                  </p>
                </div>
                {/* Checkmark */}
                {isSelected && (
                  <span className="shrink-0 text-[#0A7AFF]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" fill="#0A7AFF" />
                      <path d="M7.5 12l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Provider sub-options */}
              {isSelected && method.providers && method.providers.length > 1 && (
                <div className="mt-2 ml-2 flex flex-wrap gap-2">
                  {method.providers.map((p) => (
                    <ProviderButton
                      key={p.id}
                      label={p.label}
                      selected={selectedProvider === p.id}
                      onClick={() => handleProviderClick(method.id, p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
