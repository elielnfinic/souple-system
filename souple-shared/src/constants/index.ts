import type { OrgRole, SupportedLocale } from '../types/index.js'

// ─── Roles ───────────────────────────────────────────────────────────────────

export const ORG_ROLES: OrgRole[] = ['owner', 'manager', 'finance', 'ticketer', 'driver']

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,
  manager: 80,
  finance: 60,
  ticketer: 40,
  driver: 20,
}

export function hasRoleOrAbove(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// ─── Locales ─────────────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES: SupportedLocale[] = ['fr', 'en', 'ln', 'sw']
export const DEFAULT_LOCALE: SupportedLocale = 'fr'

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: 'Français',
  en: 'English',
  ln: 'Lingála',
  sw: 'Kiswahili',
}

// ─── Timezones (DRC) ─────────────────────────────────────────────────────────

export const DRC_TIMEZONES = {
  WEST: 'Africa/Kinshasa',   // UTC+1 — Kinshasa, Bandundu, Équateur
  EAST: 'Africa/Lubumbashi', // UTC+2 — Lubumbashi, Goma, Bukavu
} as const

export const DEFAULT_TIMEZONE = DRC_TIMEZONES.EAST

// ─── Currency ─────────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY = 'CDF' as const
export const SUPPORTED_CURRENCIES = ['CDF', 'USD', 'EUR'] as const

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const OTP_LENGTH = 6
export const OTP_EXPIRY_MINUTES = 5
export const ACCESS_TOKEN_EXPIRY_HOURS = 1
export const REFRESH_TOKEN_EXPIRY_DAYS = 30

// ─── Rate Limits ──────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  GLOBAL_RPM: 100,
  AUTH_RPM: 5,
  AUTHENTICATED_RPM: 60,
} as const

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  VALIDATION: 'E_VALIDATION',
  UNAUTHORIZED: 'E_UNAUTHORIZED',
  FORBIDDEN: 'E_FORBIDDEN',
  NOT_FOUND: 'E_NOT_FOUND',
  CONFLICT: 'E_CONFLICT',
  RATE_LIMIT: 'E_RATE_LIMIT',
  SERVER_ERROR: 'E_SERVER_ERROR',
  OTP_INVALID: 'E_OTP_INVALID',
  OTP_EXPIRED: 'E_OTP_EXPIRED',
  TOKEN_EXPIRED: 'E_TOKEN_EXPIRED',
  SEAT_TAKEN: 'E_SEAT_TAKEN',
  PAYMENT_FAILED: 'E_PAYMENT_FAILED',
} as const

// ─── KYC Levels ───────────────────────────────────────────────────────────────

export const KYC_LEVELS = {
  NONE: 0,
  BASIC: 1,
  FULL: 2,
} as const

export const KYC_LEVEL_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Basic (ID)',
  2: 'Full (ID + Selfie)',
}
