import TripSeat from '#models/trip_seat'
import db from '@adonisjs/lucid/services/db'

export class SegmentAvailabilityService {
  /**
   * Get all bookable seats available for a given segment [boardingStopOrder, alightingStopOrder).
   * A seat is unavailable if any confirmed/boarded/pending booking holds it for an overlapping segment.
   */
  async getAvailableSeats(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<TripSeat[]> {
    const bookedSeatIds = await this.#getBookedTripSeatIds(tripId, boardingStopOrder, alightingStopOrder)

    let query = TripSeat.query().where('trip_id', tripId).where('is_bookable', true)
    if (bookedSeatIds.length > 0) {
      query = query.whereNotIn('id', bookedSeatIds)
    }
    return query.orderBy('seat_row').orderBy('seat_col')
  }

  /**
   * Check whether all requested seats are available for the given segment.
   */
  async checkSeatsAvailable(
    tripId: number,
    seatIds: string[],
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<boolean> {
    const bookedTripSeatIds = await this.#getBookedTripSeatIds(
      tripId,
      boardingStopOrder,
      alightingStopOrder
    )

    const requestedSeats = await TripSeat.query()
      .where('trip_id', tripId)
      .whereIn('seat_id', seatIds)
      .where('is_bookable', true)

    if (requestedSeats.length !== seatIds.length) return false

    return requestedSeats.every((s) => !bookedTripSeatIds.includes(s.id))
  }

  /**
   * Returns all seats for the trip with their availability status for the given segment.
   */
  async getSeatAvailabilityMap(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<Array<{ seat: TripSeat; isAvailable: boolean }>> {
    const [allSeats, bookedSeatIds] = await Promise.all([
      TripSeat.query().where('trip_id', tripId).orderBy('seat_row').orderBy('seat_col'),
      this.#getBookedTripSeatIds(tripId, boardingStopOrder, alightingStopOrder),
    ])

    return allSeats.map((seat) => ({
      seat,
      isAvailable: seat.isBookable && !bookedSeatIds.includes(seat.id),
    }))
  }

  async #getBookedTripSeatIds(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<number[]> {
    // Segments overlap if: existing booking starts before our end AND existing booking ends after our start
    const rows = await db
      .from('booking_seats')
      .join('bookings', 'booking_seats.booking_id', 'bookings.id')
      .where('bookings.trip_id', tripId)
      .where('bookings.boarding_stop_order', '<', alightingStopOrder)
      .where('bookings.alighting_stop_order', '>', boardingStopOrder)
      .whereIn('bookings.status', ['confirmed', 'boarded', 'pending'])
      .distinct('booking_seats.trip_seat_id')
      .select('booking_seats.trip_seat_id')

    return rows.map((r: { trip_seat_id: number }) => r.trip_seat_id)
  }
}
