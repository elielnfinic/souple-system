import { DateTime } from 'luxon'

// DRC has two timezones
export const DRC_TIMEZONES = {
  WEST: 'Africa/Kinshasa',    // UTC+1 — Kinshasa, Bandundu, Équateur
  EAST: 'Africa/Lubumbashi',  // UTC+2 — Lubumbashi, Goma, Bukavu
} as const

export const DEFAULT_TIMEZONE = DRC_TIMEZONES.EAST

/**
 * Resolve the user's timezone from priority order:
 * 1. Explicit user profile setting
 * 2. Browser Intl detection
 * 3. Fallback: Africa/Lubumbashi (DRC East)
 */
export function getUserTimezone(profileTimezone?: string): string {
  if (profileTimezone) return profileTimezone

  if (typeof window !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      // Ignore
    }
  }

  return DEFAULT_TIMEZONE
}

export type DateFormat = 'full' | 'date' | 'time' | 'relative' | 'short' | 'medium'

/**
 * Format a UTC ISO string for display in the user's timezone.
 * NEVER display raw UTC to users.
 *
 * @example
 * formatDateTime('2026-02-27T12:30:00Z', { format: 'full', locale: 'fr' })
 * // → "jeudi 27 février 2026 à 14:30"  (in Africa/Lubumbashi UTC+2)
 */
export function formatDateTime(
  isoString: string,
  options: {
    format?: DateFormat
    timezone?: string
    locale?: string
  } = {}
): string {
  const tz = options.timezone ?? getUserTimezone()
  const locale = options.locale ?? 'fr'

  const dt = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(tz).setLocale(locale)

  switch (options.format) {
    case 'full':
      return dt.toLocaleString(DateTime.DATETIME_FULL)

    case 'date':
      return dt.toLocaleString(DateTime.DATE_MED)

    case 'time':
      return dt.toLocaleString(DateTime.TIME_SIMPLE)

    case 'short':
      return dt.toLocaleString(DateTime.DATETIME_SHORT)

    case 'relative':
      return dt.toRelative({ locale }) ?? ''

    case 'medium':
    default:
      return dt.toLocaleString(DateTime.DATETIME_MED)
  }
}

/**
 * Format a trip departure/arrival time.
 * Shows timezone abbreviation when the city timezone differs from user timezone.
 *
 * @example
 * formatTripTime('2026-02-27T12:30:00Z', 'Africa/Kinshasa', 'fr')
 * // → "13:30 (WAT)"  if user is in Africa/Lubumbashi
 * // → "13:30"        if user is also in Africa/Kinshasa
 */
export function formatTripTime(
  isoString: string,
  cityTimezone: string,
  locale: string
): string {
  const dt = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(cityTimezone).setLocale(locale)
  const userTz = getUserTimezone()

  if (cityTimezone !== userTz) {
    return `${dt.toLocaleString(DateTime.TIME_SIMPLE)} (${dt.offsetNameShort})`
  }

  return dt.toLocaleString(DateTime.TIME_SIMPLE)
}

/**
 * Format a duration in minutes as human-readable string.
 * Format is always "Xh Ymin" — locale-independent.
 *
 * @example
 * formatDuration(330) // → "5h 30min"
 * formatDuration(60)  // → "1h"
 * formatDuration(45)  // → "45min"
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Get a full tooltip string with timezone context.
 * Used in <TimeDisplay showTooltip />.
 *
 * @example
 * getTimezoneTooltip('2026-02-27T12:30:00Z', 'Africa/Lubumbashi', 'en')
 * // → "Thursday, February 27, 2026 at 2:30 PM CAT (UTC+2)"
 */
export function getTimezoneTooltip(
  isoString: string,
  timezone?: string,
  locale?: string
): string {
  const tz = timezone ?? getUserTimezone()
  const dt = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(tz).setLocale(locale ?? 'en')

  const formatted = dt.toLocaleString(DateTime.DATETIME_FULL)
  const tzAbbr = dt.offsetNameShort
  const offset = dt.toFormat('ZZ') // e.g. "+02:00"

  return `${formatted} ${tzAbbr} (UTC${offset})`
}
