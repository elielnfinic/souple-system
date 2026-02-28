import Trip from '#models/trip'
import TripStop from '#models/trip_stop'
import Booking from '#models/booking'

export interface StopLoad {
  stopOrder: number
  stopName: string
  boardingCount: number
  alightingCount: number
  onboard: number
  capacity: number
  utilizationPct: number
}

export interface CapacityValidationResult {
  valid: boolean
  bottleneckStop?: string
  currentLoad?: number
}

export class CapacityService {
  /**
   * For each stop on a trip, calculate how many passengers are on board.
   *
   * Uses a running total:
   *   after stop 0: passengers who board at stop 0 minus passengers alighting at stop 0
   *   after stop N: previous_onboard + boarded_at_N - alighted_at_N
   */
  async getLoadPerStop(tripId: number): Promise<StopLoad[]> {
    const trip = await Trip.findOrFail(tripId)

    const tripStops = await TripStop.query()
      .where('trip_id', tripId)
      .preload('city')
      .orderBy('stop_order', 'asc')

    if (tripStops.length === 0) {
      return []
    }

    // Load all active bookings for this trip
    const activeBookings = await Booking.query()
      .where('trip_id', tripId)
      .whereNotIn('status', ['cancelled', 'refunded'])
      .select('boarding_stop_order', 'alighting_stop_order', 'seat_count')

    let onboard = 0
    const result: StopLoad[] = []

    for (const stop of tripStops) {
      const boardingCount = activeBookings
        .filter((b) => b.boardingStopOrder === stop.stopOrder)
        .reduce((sum, b) => sum + b.seatCount, 0)

      const alightingCount = activeBookings
        .filter((b) => b.alightingStopOrder === stop.stopOrder)
        .reduce((sum, b) => sum + b.seatCount, 0)

      // Passengers alight before new ones board at the same stop
      onboard = onboard - alightingCount + boardingCount

      const stopName = stop.city?.name ?? `Stop ${stop.stopOrder}`
      result.push({
        stopOrder: stop.stopOrder,
        stopName,
        boardingCount,
        alightingCount,
        onboard,
        capacity: trip.totalSeats,
        utilizationPct: trip.totalSeats > 0 ? Math.round((onboard / trip.totalSeats) * 100) : 0,
      })
    }

    return result
  }

  /**
   * Check if adding a booking would exceed capacity at any stop along the segment.
   *
   * For each stop between boarding and alighting (exclusive of alighting since
   * the passenger is no longer on board there), checks whether current onboard
   * count plus the new seat count exceeds total_seats.
   */
  async validateCapacity(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number,
    seatCount: number
  ): Promise<CapacityValidationResult> {
    const trip = await Trip.findOrFail(tripId)

    const tripStops = await TripStop.query()
      .where('trip_id', tripId)
      .preload('city')
      .orderBy('stop_order', 'asc')
      .whereBetween('stop_order', [boardingStopOrder, alightingStopOrder - 1])

    if (tripStops.length === 0) {
      return { valid: true }
    }

    const activeBookings = await Booking.query()
      .where('trip_id', tripId)
      .whereNotIn('status', ['cancelled', 'refunded'])
      .select('boarding_stop_order', 'alighting_stop_order', 'seat_count')

    // For each stop in the requested range, count how many passengers are currently on board
    // A passenger is on board at stop S if:
    //   their boarding_stop_order <= S AND their alighting_stop_order > S
    for (const stop of tripStops) {
      const currentOnboard = activeBookings
        .filter(
          (b) =>
            b.boardingStopOrder <= stop.stopOrder &&
            b.alightingStopOrder > stop.stopOrder
        )
        .reduce((sum, b) => sum + b.seatCount, 0)

      if (currentOnboard + seatCount > trip.totalSeats) {
        const stopName = stop.city?.name ?? `Stop ${stop.stopOrder}`
        return {
          valid: false,
          bottleneckStop: stopName,
          currentLoad: currentOnboard,
        }
      }
    }

    return { valid: true }
  }
}
