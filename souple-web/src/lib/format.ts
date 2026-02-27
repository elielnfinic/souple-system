/**
 * Formatting utilities for currency, numbers, phone, and distance.
 * All formatting is locale-aware and DRC-first.
 */

export type SupportedCurrency = 'CDF' | 'USD' | 'EUR'

/**
 * Format a currency amount per user's locale.
 *
 * CDF (Franc Congolais) has no decimal places in practice.
 * USD/EUR use standard 2 decimal places.
 *
 * @example
 * formatCurrency(45000, 'CDF', 'fr') // → "45 000 FC"
 * formatCurrency(45000, 'CDF', 'en') // → "45,000 FC"
 * formatCurrency(25, 'USD', 'fr')    // → "25,00 $"
 * formatCurrency(25, 'USD', 'en')    // → "$25.00"
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  locale?: string
): string {
  const userLocale = locale ?? 'fr'

  if (currency === 'CDF') {
    const formatted = new Intl.NumberFormat(userLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
    return `${formatted} FC`
  }

  return new Intl.NumberFormat(userLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format dual-currency display (CDF + USD equivalent).
 * This is the standard Souple display format.
 *
 * @example
 * formatDualCurrency(45000, 'CDF', 16.07, 'fr')
 * // → "45 000 FC (~$16)"
 */
export function formatDualCurrency(
  primaryAmount: number,
  primaryCurrency: SupportedCurrency,
  usdEquivalent: number,
  locale?: string
): string {
  const primary = formatCurrency(primaryAmount, primaryCurrency, locale)
  const usd = Math.round(usdEquivalent)
  return `${primary} (~$${usd})`
}

/**
 * Format a phone number for display.
 * DRC numbers: +243 XXX XXX XXX
 *
 * @example
 * formatPhone('+243812345678') // → "+243 812 345 678"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('243') && cleaned.length === 12) {
    const rest = cleaned.slice(3)
    return `+243 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
  }

  if (cleaned.length === 9) {
    return `+243 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }

  return phone
}

/**
 * Format a distance in km.
 * Always in km for DRC market.
 *
 * @example
 * formatDistance(1500, 'fr') // → "1 500 km"
 * formatDistance(1500, 'en') // → "1,500 km"
 */
export function formatDistance(km: number, locale?: string): string {
  return `${new Intl.NumberFormat(locale ?? 'fr').format(Math.round(km))} km`
}

/**
 * Format a plain number with locale-specific separators.
 */
export function formatNumber(value: number, locale?: string, decimals = 0): string {
  return new Intl.NumberFormat(locale ?? 'fr', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format a percentage.
 *
 * @example
 * formatPercent(0.75, 'fr') // → "75 %"
 * formatPercent(0.75, 'en') // → "75%"
 */
export function formatPercent(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? 'fr', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Format a file size in human-readable form.
 *
 * @example
 * formatFileSize(1500000) // → "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
