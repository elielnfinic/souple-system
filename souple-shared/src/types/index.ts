// ─── Roles & Permissions ────────────────────────────────────────────────────

export type OrgRole = 'owner' | 'manager' | 'finance' | 'ticketer' | 'driver'
export type OrgType = 'agency' | 'company' | 'independent'

// ─── User ───────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string | null
  phone: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  locale: SupportedLocale
  isSuperAdmin: boolean
  isActive: boolean
  emailVerifiedAt: string | null
  phoneVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserWithMembership extends User {
  membership?: OrgMember
}

// ─── Organization ────────────────────────────────────────────────────────────

export interface Organization {
  id: number
  name: string
  slug: string
  type: OrgType
  logoUrl: string | null
  address: string | null
  city: string
  country: string
  phone: string
  email: string
  taxId: string | null
  requiredKycLevel: 0 | 1 | 2
  isPublic: boolean
  isActive: boolean
  settings: OrgSettings | null
  createdAt: string
  updatedAt: string
}

export interface OrgSettings {
  timezone?: string
  currency?: 'CDF' | 'USD'
  cancellationPolicy?: {
    hoursBeforeDeparture: number
    refundPercentage: number
  }
  bookingConfirmationMode?: 'auto' | 'manual'
}

export interface OrgMember {
  id: number
  organizationId: number
  userId: number
  role: OrgRole
  isActive: boolean
  joinedAt: string
  createdAt: string
  updatedAt: string
}

// ─── Geography ───────────────────────────────────────────────────────────────

export interface City {
  id: number
  name: string
  province: string
  country: string
  latitude: number | null
  longitude: number | null
  timezone: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Route {
  id: number
  fromCityId: number
  toCityId: number
  fromCity?: City
  toCity?: City
  distanceKm: number | null
  estimatedDurationMin: number | null
  isActive: boolean
  stops?: RouteStop[]
  createdAt: string
  updatedAt: string
}

export interface RouteStop {
  id: number
  routeId: number
  cityId: number
  city?: City
  stopOrder: number
  distanceFromStartKm: number | null
  createdAt: string
  updatedAt: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthToken {
  type: 'bearer'
  token: string
  expiresAt: string
}

export interface AuthResponse {
  user: User
  token: AuthToken
  refreshToken: string
}

export interface OtpRequest {
  phone?: string
  email?: string
  purpose: OtpPurpose
}

export type OtpPurpose = 'login' | 'register' | 'password_reset' | 'phone_verify' | 'email_verify'

// ─── API Response Envelope ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: ValidationDetail[]
  }
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export interface ValidationDetail {
  field: string
  message: string
  rule?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number
  organizationId: number | null
  userId: number | null
  action: string
  entityType: string
  entityId: number | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// ─── i18n ────────────────────────────────────────────────────────────────────

export type SupportedLocale = 'fr' | 'en' | 'ln' | 'sw'
export type SupportedCurrency = 'CDF' | 'USD' | 'EUR'

// ─── Statuses ────────────────────────────────────────────────────────────────

export type TripStatus = 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'completed' | 'cancelled'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
export type VehicleStatus = 'active' | 'maintenance' | 'inactive' | 'pending_verification'
export type KycLevel = 0 | 1 | 2
