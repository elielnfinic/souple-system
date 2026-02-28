// ─── USSD Session Types ───────────────────────────────────────────────────────
//
// UssdStep enumerates every screen in the USSD menu state machine.
// UssdSessionData is the payload persisted in Redis for each active session.

export type UssdStep =
  | 'main'
  | 'search_from'
  | 'search_to'
  | 'search_date'
  | 'select_trip'
  | 'select_seats'
  | 'select_payment'
  | 'enter_phone'
  | 'processing'
  | 'my_bookings'
  | 'booking_status'
  | 'language_select'

export interface UssdTripSummary {
  id: number
  departureAt: string
  agency: string
  price: number
  seats: number
}

export interface UssdSessionData {
  step: UssdStep
  locale: 'fr' | 'en' | 'ln' | 'sw'
  phoneNumber: string
  fromCity?: string
  fromCityId?: number
  toCity?: string
  toCityId?: number
  /** Travel date as entered by the user: DD/MM */
  date?: string
  trips?: UssdTripSummary[]
  selectedTripId?: number
  /** Index into the trips array */
  selectedTripIndex?: number
  seatCount?: number
  paymentProvider?: string
  bookingCode?: string
}
