// ─── Vehicle & Fleet Types ────────────────────────────────────────────────────

export interface Vehicle {
  id: number
  organizationId?: number
  ownerUserId: number
  type: 'minibus' | 'bus' | 'sedan' | 'van' | 'pickup'
  brand: string
  model: string
  year?: number
  color: string
  plateNumber: string
  totalSeats: number
  visibility: 'public' | 'private'
  isAvailableForRental: boolean
  verificationStatus: 'pending' | 'verified' | 'rejected'
  isActive: boolean
  rating: number
  totalTrips: number
  features?: string[]
  photos?: VehiclePhoto[]
  seatLayouts?: SeatLayout[]
}

export interface VehiclePhoto {
  url: string
  key: string
  is_primary: boolean
}

export interface SeatLayout {
  id: number
  vehicleId: number
  name: string
  rows: number
  columns: number
  layoutData: LayoutData
  isDefault: boolean
  isActive: boolean
}

export interface LayoutData {
  seats: SeatDefinition[]
  legend?: Record<string, { color: string; label: string }>
}

export interface SeatDefinition {
  id: string
  row: number
  col: number
  type: 'driver' | 'seat' | 'aisle' | 'door' | 'luggage' | 'empty'
  class?: 'vip' | 'economy' | 'business' | null
  bookable: boolean
  label?: string
  price_multiplier?: number
  features?: string[]
}

export interface SeatClass {
  id: number
  name: string
  slug: string
  description?: string
  defaultMultiplier: number
  color?: string
  icon?: string
}

// ─── Trip & Booking Types (Skill 04) ─────────────────────────────────────────

export interface Trip {
  id: number
  organizationId?: number
  vehicleId: number
  driverUserId: number
  routeId: number
  seatLayoutId: number
  departureAt: string
  estimatedArrivalAt?: string
  totalSeats: number
  status: 'scheduled' | 'boarding' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  allowIntermediateBoarding: boolean
  vehicle?: Vehicle
  stops?: TripStop[]
}

export interface TripStop {
  id: number
  tripId: number
  cityId: number
  stopOrder: number
  stopName?: string
  scheduledArrivalAt?: string
  scheduledDepartureAt?: string
  actualArrivalAt?: string
  distanceFromStartKm: number
  boardingEnabled: boolean
  alightingEnabled: boolean
  city?: { id: number; name: string }
}

export interface TripSeat {
  id: number
  tripId: number
  seatIdentifier: string
  seatClass: string
  fullTripPrice: number
  currency: string
  isBlocked: boolean
  status?: 'available' | 'booked' | 'reserved' | 'blocked'
}

export interface Booking {
  id: number
  bookingCode: string
  tripId: number
  userId?: number
  passengerName: string
  passengerPhone: string
  boardingStopId: number
  alightingStopId: number
  boardingStopOrder: number
  alightingStopOrder: number
  seatCount: number
  totalAmount: number
  currency: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded'
  qrCodeData?: string
  checkedInAt?: string
  seats?: BookingSeat[]
  boardingStop?: TripStop
  alightingStop?: TripStop
}

export interface BookingSeat {
  id: number
  bookingId: number
  tripSeatId: number
  passengerName?: string
  tripSeat?: TripSeat
}

export interface SeatMapEntry {
  id: number
  seatIdentifier: string
  seatClass: string
  fullTripPrice: number
  currency: string
  status: 'available' | 'booked' | 'reserved' | 'blocked'
}

export interface PriceRule {
  id: number
  routeId: number
  fromStopOrder?: number
  toStopOrder?: number
  basePrice: number
  currency: string
  priceMode: 'fixed' | 'per_segment' | 'per_km'
  isActive: boolean
}

export interface FleetBooking {
  id: number
  bookingCode: string
  vehicleId: number
  type: 'event' | 'moving' | 'day_rental' | 'pickup' | 'custom'
  title: string
  startAt: string
  endAt: string
  pickupLocation: string
  totalAmount: number
  currency: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
}

// ─── Payment Types (Skill 05) ─────────────────────────────────────────────────

export interface Payment {
  id: number
  bookingId?: number
  fleetBookingId?: number
  organizationId?: number
  userId?: number
  amount: number
  currency: string
  method: 'mobile_money' | 'card' | 'stripe' | 'stablecoin' | 'cash'
  provider?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded'
  externalTransactionId?: string
  phoneNumber?: string
  paidAt?: string
  refundedAt?: string
  refundAmount?: number
  createdAt: string
}

export interface PaymentTransaction {
  id: number
  paymentId: number
  type: 'charge' | 'refund' | 'payout'
  amount: number
  currency: string
  status: 'pending' | 'success' | 'failed'
  providerReference?: string
  errorMessage?: string
  createdAt: string
}

export interface PayoutRecord {
  id: number
  userId: number
  amount: number
  currency: string
  method: string
  provider: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  periodStart: string
  periodEnd: string
  processedAt?: string
}

export interface ReceiptData {
  receiptNumber: string
  date: string
  orgName: string
  passengerName: string
  route: string
  boardingStop: string
  alightingStop: string
  seats: string[]
  amount: number
  currency: string
  paymentMethod: string
  paymentReference: string
  bookingCode: string
}

// ─── Notification Types (Skill 06) ───────────────────────────────────────────

export interface Notification {
  id: number
  userId: number
  organizationId?: number
  channel: 'email' | 'sms' | 'telegram' | 'push'
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed'
  readAt?: string
  sentAt?: string
  createdAt: string
}

export interface NotificationPreference {
  id: number
  userId: number
  channel: 'email' | 'sms' | 'telegram' | 'push'
  type: string
  enabled: boolean
}

// ─── Messaging Types (Skill 21) ───────────────────────────────────────────────

export interface Conversation {
  id: number
  type: 'passenger_agency' | 'passenger_driver' | 'internal'
  status: 'active' | 'archived' | 'blocked'
  bookingId?: number
  tripId?: number
  participantAId: number
  participantBId?: number
  participantBOrgId?: number
  lastMessageAt?: string
  unreadCount?: number
  lastMessage?: Message
  participantA?: { id: number; fullName: string; phone?: string; email?: string }
  participantB?: { id: number; fullName: string; phone?: string; email?: string }
  participantBOrg?: { id: number; name: string }
}

export interface Message {
  id: number
  conversationId: number
  senderUserId: number
  content: string
  type: 'text' | 'image' | 'document' | 'system'
  readAt?: string
  createdAt: string
  sender?: { id: number; fullName: string }
}

export interface CannedResponse {
  id: number
  organizationId: number
  shortcut: string
  text: Record<string, string>
  category?: string
  isActive: boolean
}

// ─── API Response Envelopes ───────────────────────────────────────────────────

export interface ApiList<T> {
  success: true
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    lastPage: number
  }
}

export interface ApiItem<T> {
  success: true
  data: T
}
