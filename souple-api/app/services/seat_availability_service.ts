import db from '@adonisjs/lucid/services/db'
import TripSeat from '#models/trip_seat'
import SeatReservation from '#models/seat_reservation'
import { DateTime } from 'luxon'

export interface SeatMapEntry {
  id: number
  seatIdentifier: string
  seatClass: string
  fullTripPrice: number
  currency: string
  status: 'available' | 'booked' | 'reserved' | 'blocked'
}

export interface ConflictInfo {
  seatId: number
  seatIdentifier: string
  conflictType: 'booked' | 'reserved'
}

export interface CheckAndLockResult {
  available: boolean
  conflicts: ConflictInfo[]
}

export interface SegmentAvailability {
  fromStopOrder: number
  toStopOrder: number
  available: number
}

export class SeatAvailabilityService {
  /**
   * Get available seats for a specific boarding → alighting segment.
   *
   * A seat is AVAILABLE for the requested segment if:
   * 1. The seat is not blocked (is_blocked = false)
   * 2. No active booking (status NOT IN cancelled, refunded) exists where:
   *    existing.boarding_stop_order < requested.alighting_stop_order
   *    AND existing.alighting_stop_order > requested.boarding_stop_order
   * 3. No active reservation exists with the same overlap logic AND reserved_until > now
   */
  async getAvailableSeats(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<TripSeat[]> {
    const occupiedResult = await db.rawQuery(
      `
      SELECT DISTINCT bs.trip_seat_id
      FROM booking_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.trip_id = ?
        AND b.status NOT IN ('cancelled', 'refunded')
        AND b.boarding_stop_order < ?
        AND b.alighting_stop_order > ?
      UNION
      SELECT sr.trip_seat_id
      FROM seat_reservations sr
      WHERE sr.trip_id = ?
        AND sr.reserved_until > NOW()
        AND sr.boarding_stop_order < ?
        AND sr.alighting_stop_order > ?
      `,
      [
        tripId,
        alightingStopOrder,
        boardingStopOrder,
        tripId,
        alightingStopOrder,
        boardingStopOrder,
      ]
    )

    const occupiedIds: number[] = (occupiedResult[0] as any[]).map(
      (r: any) => r.trip_seat_id
    )

    const query = TripSeat.query().where('trip_id', tripId).where('is_blocked', false)

    if (occupiedIds.length > 0) {
      query.whereNotIn('id', occupiedIds)
    }

    return await query.orderBy('seat_identifier', 'asc')
  }

  /**
   * Get seat availability map for all seats — returns each seat's status
   * for the requested boarding → alighting segment.
   */
  async getSeatMap(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<SeatMapEntry[]> {
    const allSeats = await TripSeat.query().where('trip_id', tripId).orderBy('seat_identifier', 'asc')

    if (allSeats.length === 0) {
      return []
    }

    // Get booked seat IDs for this segment
    const bookedResult = await db.rawQuery(
      `
      SELECT DISTINCT bs.trip_seat_id
      FROM booking_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.trip_id = ?
        AND b.status NOT IN ('cancelled', 'refunded')
        AND b.boarding_stop_order < ?
        AND b.alighting_stop_order > ?
      `,
      [tripId, alightingStopOrder, boardingStopOrder]
    )

    // Get reserved seat IDs for this segment
    const reservedResult = await db.rawQuery(
      `
      SELECT DISTINCT sr.trip_seat_id
      FROM seat_reservations sr
      WHERE sr.trip_id = ?
        AND sr.reserved_until > NOW()
        AND sr.boarding_stop_order < ?
        AND sr.alighting_stop_order > ?
      `,
      [tripId, alightingStopOrder, boardingStopOrder]
    )

    const bookedIds = new Set<number>(
      (bookedResult[0] as any[]).map((r: any) => r.trip_seat_id)
    )
    const reservedIds = new Set<number>(
      (reservedResult[0] as any[]).map((r: any) => r.trip_seat_id)
    )

    return allSeats.map((seat) => {
      let status: SeatMapEntry['status']

      if (seat.isBlocked) {
        status = 'blocked'
      } else if (bookedIds.has(seat.id)) {
        status = 'booked'
      } else if (reservedIds.has(seat.id)) {
        status = 'reserved'
      } else {
        status = 'available'
      }

      return {
        id: seat.id,
        seatIdentifier: seat.seatIdentifier,
        seatClass: seat.seatClass,
        fullTripPrice: seat.fullTripPrice,
        currency: seat.currency,
        status,
      }
    })
  }

  /**
   * Check if specific seats are available for a segment and lock them.
   * Must be called WITHIN an existing database transaction.
   */
  async checkAndLockSeats(
    tripId: number,
    seatIds: number[],
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<CheckAndLockResult> {
    if (seatIds.length === 0) {
      return { available: true, conflicts: [] }
    }

    const placeholders = seatIds.map(() => '?').join(', ')

    // Check active bookings that overlap with our segment for the specific seats
    const bookedConflictsResult = await db.rawQuery(
      `
      SELECT DISTINCT ts.id AS seat_id, ts.seat_identifier, 'booked' AS conflict_type
      FROM trip_seats ts
      JOIN booking_seats bs ON bs.trip_seat_id = ts.id
      JOIN bookings b ON b.id = bs.booking_id
      WHERE ts.id IN (${placeholders})
        AND b.trip_id = ?
        AND b.status NOT IN ('cancelled', 'refunded')
        AND b.boarding_stop_order < ?
        AND b.alighting_stop_order > ?
      FOR UPDATE
      `,
      [...seatIds, tripId, alightingStopOrder, boardingStopOrder]
    )

    // Check active reservations that overlap with our segment for the specific seats
    const reservedConflictsResult = await db.rawQuery(
      `
      SELECT DISTINCT ts.id AS seat_id, ts.seat_identifier, 'reserved' AS conflict_type
      FROM trip_seats ts
      JOIN seat_reservations sr ON sr.trip_seat_id = ts.id
      WHERE ts.id IN (${placeholders})
        AND sr.trip_id = ?
        AND sr.reserved_until > NOW()
        AND sr.boarding_stop_order < ?
        AND sr.alighting_stop_order > ?
      `,
      [...seatIds, tripId, alightingStopOrder, boardingStopOrder]
    )

    const conflicts: ConflictInfo[] = [
      ...(bookedConflictsResult[0] as any[]).map((r: any) => ({
        seatId: r.seat_id,
        seatIdentifier: r.seat_identifier,
        conflictType: 'booked' as const,
      })),
      ...(reservedConflictsResult[0] as any[]).map((r: any) => ({
        seatId: r.seat_id,
        seatIdentifier: r.seat_identifier,
        conflictType: 'reserved' as const,
      })),
    ]

    return {
      available: conflicts.length === 0,
      conflicts,
    }
  }

  /**
   * Release expired seat reservations.
   * Called periodically or before availability checks as cleanup.
   */
  async cleanupExpiredReservations(): Promise<number> {
    const result = await SeatReservation.query()
      .where('reserved_until', '<', DateTime.utc().toSQL()!)
      .delete()

    return result as unknown as number
  }
}
