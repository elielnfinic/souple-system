import Booking from '#models/booking'
import TripStop from '#models/trip_stop'

export interface TicketStop {
  cityName: string
  stopOrder: number
  scheduledArrivalAt: string | null
  scheduledDepartureAt: string | null
}

export interface TicketSeat {
  seatIdentifier: string
  seatClass: string
}

export interface TicketData {
  bookingCode: string
  qrCodeData: string | null
  passengerName: string
  passengerPhone: string
  passengerEmail: string | null
  source: string
  type: string
  status: string
  boardingCity: string
  boardingTerminal: string | null
  boardingTime: string | null
  alightingCity: string
  alightingTerminal: string | null
  alightingTime: string | null
  intermediateStops: TicketStop[]
  seats: TicketSeat[]
  seatCount: number
  totalAmount: number
  currency: string
  departureAt: string
  organizationId: number | null
}

export class TicketService {
  /**
   * Generate structured ticket data for a booking.
   * The QR code string is included — the frontend renders the actual QR image.
   */
  async generateTicketData(bookingId: number): Promise<TicketData> {
    const booking = await Booking.query()
      .where('id', bookingId)
      .preload('trip', (q) => q.preload('route'))
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .preload('bookingSeats', (q) => q.preload('tripSeat'))
      .firstOrFail()

    const boardingStop = booking.boardingStop
    const alightingStop = booking.alightingStop

    // Load all stops between boarding and alighting (exclusive of both endpoints)
    const intermediateStopRecords = await TripStop.query()
      .where('trip_id', booking.tripId)
      .where('stop_order', '>', boardingStop.stopOrder)
      .where('stop_order', '<', alightingStop.stopOrder)
      .preload('city')
      .orderBy('stop_order', 'asc')

    const intermediateStops: TicketStop[] = intermediateStopRecords.map((s) => ({
      cityName: s.city?.name ?? `Stop ${s.stopOrder}`,
      stopOrder: s.stopOrder,
      scheduledArrivalAt: s.scheduledArrivalAt?.toISO() ?? null,
      scheduledDepartureAt: s.scheduledDepartureAt?.toISO() ?? null,
    }))

    const seats: TicketSeat[] = booking.bookingSeats.map((bs) => ({
      seatIdentifier: bs.tripSeat?.seatIdentifier ?? 'N/A',
      seatClass: bs.tripSeat?.seatClass ?? 'economy',
    }))

    const boardingDepartureTime =
      boardingStop.scheduledDepartureAt?.toISO() ??
      boardingStop.actualDepartureAt?.toISO() ??
      null

    const alightingArrivalTime =
      alightingStop.scheduledArrivalAt?.toISO() ??
      alightingStop.actualArrivalAt?.toISO() ??
      null

    return {
      bookingCode: booking.bookingCode,
      qrCodeData: booking.qrCodeData,
      passengerName: booking.passengerName,
      passengerPhone: booking.passengerPhone,
      passengerEmail: booking.passengerEmail,
      source: booking.source,
      type: booking.type,
      status: booking.status,
      boardingCity: boardingStop.city?.name ?? 'Unknown',
      boardingTerminal: boardingStop.stopName,
      boardingTime: boardingDepartureTime,
      alightingCity: alightingStop.city?.name ?? 'Unknown',
      alightingTerminal: alightingStop.stopName,
      alightingTime: alightingArrivalTime,
      intermediateStops,
      seats,
      seatCount: booking.seatCount,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      departureAt: booking.trip?.departureAt?.toISO() ?? '',
      organizationId: booking.organizationId,
    }
  }
}
