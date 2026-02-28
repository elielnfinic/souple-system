import { api } from '@/lib/api-client'
import type { RequestOptions } from '@/lib/api-client'
import type {
  Trip,
  TripStop,
  TripSeat,
  Booking,
  BookingSeat,
  SeatMapEntry,
  PriceRule,
  FleetBooking,
  ApiList,
  ApiItem,
} from '@/lib/types'

// ─── Trips ────────────────────────────────────────────────────────────────────

export interface TripSearchParams {
  fromCityId?: number
  toCityId?: number
  date?: string
  passengers?: number
  page?: number
  perPage?: number
}

export interface TripListParams {
  page?: number
  perPage?: number
  status?: Trip['status']
  dateFrom?: string
  dateTo?: string
  routeId?: number
  vehicleId?: number
}

export interface CreateTripData {
  vehicleId: number
  driverUserId: number
  routeId: number
  seatLayoutId: number
  departureAt: string
  estimatedArrivalAt?: string
  notes?: string
  allowIntermediateBoarding?: boolean
}

export interface UpdateTripData extends Partial<CreateTripData> {
  status?: Trip['status']
}

export interface TripManifestEntry {
  stopId: number
  stopName: string
  stopOrder: number
  boarding: Array<{ bookingCode: string; passengerName: string; seatIdentifiers: string[] }>
  alighting: Array<{ bookingCode: string; passengerName: string; seatIdentifiers: string[] }>
}

export const tripsApi = {
  search: (params: TripSearchParams) =>
    api.get<ApiList<Trip>>('/trips/search', {
      params: params as RequestOptions['params'],
    }),

  getTrips: (params?: TripListParams) =>
    api.get<ApiList<Trip>>('/trips', {
      params: params as RequestOptions['params'],
    }),

  getTrip: (id: number) =>
    api.get<ApiItem<Trip>>(`/trips/${id}`),

  createTrip: (data: CreateTripData) =>
    api.post<ApiItem<Trip>>('/trips', data),

  updateTrip: (id: number, data: UpdateTripData) =>
    api.patch<ApiItem<Trip>>(`/trips/${id}`, data),

  cancelTrip: (id: number) =>
    api.post<ApiItem<Trip>>(`/trips/${id}/cancel`, {}),

  getTripStops: (id: number) =>
    api.get<ApiList<TripStop>>(`/trips/${id}/stops`),

  getTripSeats: (
    id: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ) =>
    api.get<ApiList<SeatMapEntry>>(`/trips/${id}/seats`, {
      params: {
        boarding_stop_order: boardingStopOrder,
        alighting_stop_order: alightingStopOrder,
      },
    }),

  getTripManifest: (id: number, stopId?: number) =>
    api.get<{ success: true; data: TripManifestEntry[] }>(`/trips/${id}/manifest`, {
      params: stopId ? { stop_id: stopId } : undefined,
    }),

  updateStopActualTime: (tripId: number, stopId: number, data: { actualArrivalAt: string }) =>
    api.patch<ApiItem<TripStop>>(`/trips/${tripId}/stops/${stopId}`, data),
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface CreateBookingData {
  tripId: number
  passengerName: string
  passengerPhone: string
  boardingStopId: number
  alightingStopId: number
  seatIdentifiers: string[]
  source?: 'web' | 'pos' | 'api'
  currency?: string
}

export interface BookingListParams {
  page?: number
  perPage?: number
  tripId?: number
  status?: Booking['status']
}

export interface ReserveSeatData {
  seatIdentifiers: string[]
  boardingStopOrder: number
  alightingStopOrder: number
}

export const bookingsApi = {
  createBooking: (data: CreateBookingData) =>
    api.post<ApiItem<Booking>>('/bookings', data),

  getBooking: (id: number) =>
    api.get<ApiItem<Booking>>(`/bookings/${id}`),

  getBookings: (params?: BookingListParams) =>
    api.get<ApiList<Booking>>('/bookings', {
      params: params as RequestOptions['params'],
    }),

  cancelBooking: (id: number, reason?: string) =>
    api.post<ApiItem<Booking>>(`/bookings/${id}/cancel`, { reason }),

  checkIn: (id: number) =>
    api.post<ApiItem<Booking>>(`/bookings/${id}/check-in`, {}),

  getTicket: (id: number) =>
    api.get<ApiItem<Booking>>(`/bookings/${id}/ticket`),

  trackByCode: (code: string) =>
    api.get<ApiItem<Booking>>(`/bookings/track/${code}`),

  reserveSeats: (tripId: number, data: ReserveSeatData) =>
    api.post<{ success: true; data: { reservationId: string; expiresAt: string } }>(
      `/trips/${tripId}/reserve-seats`,
      data
    ),
}

// ─── Price Rules ──────────────────────────────────────────────────────────────

export interface PriceRuleListParams {
  routeId?: number
  page?: number
  perPage?: number
}

export interface CreatePriceRuleData {
  routeId: number
  fromStopOrder?: number
  toStopOrder?: number
  basePrice: number
  currency: string
  priceMode: PriceRule['priceMode']
  isActive?: boolean
}

export interface UpdatePriceRuleData extends Partial<CreatePriceRuleData> {}

export interface PriceCalculateParams {
  routeId: number
  fromStopOrder: number
  toStopOrder: number
  currency?: string
}

export interface PriceMatrixCell {
  fromStopOrder: number
  toStopOrder: number
  price: number
  currency: string
}

export const priceRulesApi = {
  list: (params?: PriceRuleListParams) =>
    api.get<ApiList<PriceRule>>('/price-rules', {
      params: params as RequestOptions['params'],
    }),

  create: (data: CreatePriceRuleData) =>
    api.post<ApiItem<PriceRule>>('/price-rules', data),

  update: (id: number, data: UpdatePriceRuleData) =>
    api.put<ApiItem<PriceRule>>(`/price-rules/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: true }>(`/price-rules/${id}`),

  calculate: (params: PriceCalculateParams) =>
    api.get<{ success: true; data: { price: number; currency: string } }>('/price-rules/calculate', {
      params: params as RequestOptions['params'],
    }),

  getMatrix: (routeId: number) =>
    api.get<{ success: true; data: PriceMatrixCell[][] }>(`/price-rules/matrix/${routeId}`),
}

// ─── Fleet Bookings ───────────────────────────────────────────────────────────

export interface CreateFleetBookingData {
  vehicleId: number
  type: FleetBooking['type']
  title: string
  startAt: string
  endAt: string
  pickupLocation: string
  totalAmount: number
  currency: string
}

export interface FleetBookingListParams {
  page?: number
  perPage?: number
  vehicleId?: number
  status?: FleetBooking['status']
}

export const fleetBookingsApi = {
  create: (data: CreateFleetBookingData) =>
    api.post<ApiItem<FleetBooking>>('/fleet-bookings', data),

  list: (params?: FleetBookingListParams) =>
    api.get<ApiList<FleetBooking>>('/fleet-bookings', {
      params: params as RequestOptions['params'],
    }),

  get: (id: number) =>
    api.get<ApiItem<FleetBooking>>(`/fleet-bookings/${id}`),

  cancel: (id: number) =>
    api.post<ApiItem<FleetBooking>>(`/fleet-bookings/${id}/cancel`, {}),
}
