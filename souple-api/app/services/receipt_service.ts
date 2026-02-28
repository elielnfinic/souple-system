import { DateTime } from 'luxon'
import Payment from '#models/payment'
import Booking from '#models/booking'
import BookingSeat from '#models/booking_seat'
import TripStop from '#models/trip_stop'
import Trip from '#models/trip'
import Organization from '#models/organization'

export interface ReceiptData {
  receiptNumber: string
  date: string
  orgName: string
  orgLogo: string | null
  passengerName: string
  passengerPhone: string
  route: string
  boardingStop: string
  alightingStop: string
  seats: string[]
  amount: number
  currency: string
  formattedAmount: string
  paymentMethod: string
  paymentReference: string
  bookingCode: string
  tripDeparture: string | null
}

export class ReceiptService {
  /**
   * Generate structured receipt data for a completed payment.
   *
   * Loads: Payment -> Booking -> Trip -> TripStops -> BookingSeats -> Organization
   */
  async generateReceipt(paymentId: number): Promise<ReceiptData> {
    const payment = await Payment.findOrFail(paymentId)

    if (payment.status !== 'completed') {
      throw new Error(
        `E_INVALID_STATUS: Cannot generate receipt for a payment with status: ${payment.status}`
      )
    }

    // ── Standard trip booking receipt ────────────────────────────────────────
    if (payment.bookingId) {
      return this.generateBookingReceipt(payment)
    }

    // ── Fleet booking receipt ─────────────────────────────────────────────────
    if (payment.fleetBookingId) {
      return this.generateFleetReceipt(payment)
    }

    throw new Error('E_INVALID_PAYMENT: Payment is not associated with any booking')
  }

  private async generateBookingReceipt(payment: Payment): Promise<ReceiptData> {
    const booking = await Booking.query()
      .where('id', payment.bookingId!)
      .preload('trip', (q) => q.preload('route', (r) => r.preload('fromCity').preload('toCity')))
      .firstOrFail()

    const trip = booking.trip

    // Load boarding and alighting stops (with city names)
    const boardingStop = await TripStop.query()
      .where('id', booking.boardingStopId)
      .preload('city')
      .firstOrFail()

    const alightingStop = await TripStop.query()
      .where('id', booking.alightingStopId)
      .preload('city')
      .firstOrFail()

    // Load booked seats
    const bookingSeats = await BookingSeat.query()
      .where('booking_id', booking.id)
      .preload('tripSeat')

    const seatIdentifiers = bookingSeats.map((bs) => bs.tripSeat?.seatIdentifier ?? `Seat ${bs.tripSeatId}`)

    // Load organization
    let orgName = 'Souple'
    let orgLogo: string | null = null

    if (booking.organizationId) {
      const org = await Organization.find(booking.organizationId)
      if (org) {
        orgName = org.name
        orgLogo = org.logoUrl ?? null
      }
    }

    const routeFrom = trip.route?.fromCity?.name ?? 'Unknown'
    const routeTo = trip.route?.toCity?.name ?? 'Unknown'
    const boardingCityName =
      boardingStop.stopName ?? boardingStop.city?.name ?? `Stop ${boardingStop.stopOrder}`
    const alightingCityName =
      alightingStop.stopName ?? alightingStop.city?.name ?? `Stop ${alightingStop.stopOrder}`

    const tripDeparture = trip.departureAt
      ? trip.departureAt.toFormat('dd MMM yyyy HH:mm')
      : null

    return {
      receiptNumber: this.formatReceiptNumber(payment.id),
      date: (payment.paidAt ?? payment.createdAt).toFormat('dd MMM yyyy HH:mm'),
      orgName,
      orgLogo,
      passengerName: booking.passengerName,
      passengerPhone: booking.passengerPhone,
      route: `${routeFrom} → ${routeTo}`,
      boardingStop: boardingCityName,
      alightingStop: alightingCityName,
      seats: seatIdentifiers,
      amount: payment.amount,
      currency: payment.currency,
      formattedAmount: this.formatAmount(payment.amount, payment.currency),
      paymentMethod: this.formatPaymentMethod(payment.method, payment.provider),
      paymentReference: payment.externalTransactionId ?? `PMT-${payment.id}`,
      bookingCode: booking.bookingCode,
      tripDeparture,
    }
  }

  private async generateFleetReceipt(payment: Payment): Promise<ReceiptData> {
    // Dynamic import to avoid circular dependencies
    const FleetBookingModule = await import('#models/fleet_booking')
    const FleetBooking = FleetBookingModule.default

    const fleetBooking = await FleetBooking.query()
      .where('id', payment.fleetBookingId!)
      .preload('user')
      .preload('vehicle')
      .firstOrFail()

    let orgName = 'Souple'
    let orgLogo: string | null = null

    if (fleetBooking.organizationId) {
      const org = await Organization.find(fleetBooking.organizationId)
      if (org) {
        orgName = org.name
        orgLogo = org.logoUrl ?? null
      }
    }

    const user = fleetBooking.user
    const passengerName = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.phone
      : 'Customer'

    return {
      receiptNumber: this.formatReceiptNumber(payment.id),
      date: (payment.paidAt ?? payment.createdAt).toFormat('dd MMM yyyy HH:mm'),
      orgName,
      orgLogo,
      passengerName,
      passengerPhone: user?.phone ?? '',
      route: `${fleetBooking.title}`,
      boardingStop: fleetBooking.pickupLocation,
      alightingStop: fleetBooking.dropoffLocation ?? 'TBD',
      seats: [],
      amount: payment.amount,
      currency: payment.currency,
      formattedAmount: this.formatAmount(payment.amount, payment.currency),
      paymentMethod: this.formatPaymentMethod(payment.method, payment.provider),
      paymentReference: payment.externalTransactionId ?? `PMT-${payment.id}`,
      bookingCode: fleetBooking.bookingCode,
      tripDeparture: fleetBooking.startAt?.toFormat('dd MMM yyyy HH:mm') ?? null,
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private formatReceiptNumber(paymentId: number): string {
    return 'RCP-' + paymentId.toString().padStart(8, '0')
  }

  private formatAmount(amount: number, currency: string): string {
    if (currency === 'CDF') {
      // No decimals for CDF — formatted as "45 000 FC"
      return new Intl.NumberFormat('fr-CD').format(Math.round(amount)) + ' FC'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  private formatPaymentMethod(method: string, provider: string | null): string {
    const methodMap: Record<string, string> = {
      mobile_money: 'Mobile Money',
      card: 'Card',
      stripe: 'Stripe',
      stablecoin: 'Stablecoin',
      cash: 'Cash',
    }

    const providerMap: Record<string, string> = {
      mtn: 'MTN MoMo',
      orange: 'Orange Money',
      airtel: 'Airtel Money',
      stripe: 'Stripe',
      stablecoin: 'Crypto',
      cash: 'Cash',
    }

    const methodLabel = methodMap[method] ?? method
    const providerLabel = provider ? (providerMap[provider] ?? provider) : null

    return providerLabel ? `${providerLabel}` : methodLabel
  }
}
