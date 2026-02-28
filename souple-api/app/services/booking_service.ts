import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Booking from '#models/booking'
import BookingSeat from '#models/booking_seat'
import SeatReservation from '#models/seat_reservation'
import TripStop from '#models/trip_stop'
import Trip from '#models/trip'
import { PriceService } from '#services/price_service'
import { CapacityService } from '#services/capacity_service'
import { SeatAvailabilityService } from '#services/seat_availability_service'

export interface CreateBookingData {
  tripId: number
  boardingStopId: number
  alightingStopId: number
  seatIds: number[]
  passengerName: string
  passengerPhone: string
  passengerEmail?: string
  source?: Booking['source']
  type?: Booking['type']
  userId?: number
  ticketerId?: number
  organizationId?: number
  offlineId?: string
}

export interface ReserveSeatParams {
  tripId: number
  seatIds: number[]
  boardingStopOrder: number
  alightingStopOrder: number
  userId?: number
}

export interface OfflineBookingInput extends CreateBookingData {
  offlineId: string
  createdAtLocal: string
}

export interface SyncResult {
  synced: Booking[]
  conflicts: Array<{ offlineId: string; reason: string }>
  errors: Array<{ offlineId: string; error: string }>
}

const priceService = new PriceService()
const capacityService = new CapacityService()
const availabilityService = new SeatAvailabilityService()

export class BookingService {
  /**
   * Create a booking for a specific trip segment (boarding stop → alighting stop).
   * All operations run within a single database transaction to prevent race conditions.
   */
  async create(data: CreateBookingData): Promise<Booking> {
    return await db.transaction(async (trx) => {
      // 1. Load trip
      const trip = await Trip.findOrFail(data.tripId)

      // 2. Load boarding and alighting stops
      const boardingStop = await TripStop.findOrFail(data.boardingStopId)
      const alightingStop = await TripStop.findOrFail(data.alightingStopId)

      if (boardingStop.tripId !== data.tripId || alightingStop.tripId !== data.tripId) {
        throw new Error('E_INVALID_STOPS: Stops do not belong to the specified trip')
      }

      // 3. Validate stop order
      if (boardingStop.stopOrder >= alightingStop.stopOrder) {
        throw new Error('E_INVALID_STOPS: Boarding stop must come before alighting stop')
      }

      // 4. Validate boarding/alighting enabled
      if (!boardingStop.boardingEnabled) {
        throw new Error('E_BOARDING_DISABLED: Boarding is not allowed at this stop')
      }
      if (!alightingStop.alightingEnabled) {
        throw new Error('E_ALIGHTING_DISABLED: Alighting is not allowed at this stop')
      }

      // 5. Validate capacity
      const capacityCheck = await capacityService.validateCapacity(
        data.tripId,
        boardingStop.stopOrder,
        alightingStop.stopOrder,
        data.seatIds.length
      )

      if (!capacityCheck.valid) {
        throw new Error(
          `E_CAPACITY_EXCEEDED: Bus is full at ${capacityCheck.bottleneckStop} (${capacityCheck.currentLoad}/${trip.totalSeats} seats)`
        )
      }

      // 6. checkAndLockSeats — within the same transaction (FOR UPDATE)
      const lockResult = await availabilityService.checkAndLockSeats(
        data.tripId,
        data.seatIds,
        boardingStop.stopOrder,
        alightingStop.stopOrder
      )

      if (!lockResult.available) {
        const conflictNames = lockResult.conflicts.map((c) => c.seatIdentifier).join(', ')
        throw new Error(
          `E_SEATS_UNAVAILABLE: Seats already occupied for this segment: ${conflictNames}`
        )
      }

      // 7. Calculate total price
      const priceResult = await priceService.calculateSegmentPrice({
        tripId: data.tripId,
        routeId: trip.routeId,
        boardingStopOrder: boardingStop.stopOrder,
        alightingStopOrder: alightingStop.stopOrder,
        seatClass: 'economy',
        date: trip.departureAt,
        orgId: data.organizationId ?? trip.organizationId ?? undefined,
        vehicleId: trip.vehicleId,
      })

      const totalAmount = priceResult.finalPrice * data.seatIds.length

      // 8. Generate booking code
      const bookingCode = this.generateBookingCode()

      // 9. Generate QR data
      const qrData = JSON.stringify({
        code: bookingCode,
        trip_id: data.tripId,
        boarding_stop_order: boardingStop.stopOrder,
        alighting_stop_order: alightingStop.stopOrder,
        seats: data.seatIds,
      })

      // 10. Create booking record
      const booking = await Booking.create(
        {
          bookingCode,
          organizationId: data.organizationId ?? trip.organizationId ?? null,
          tripId: data.tripId,
          userId: data.userId ?? null,
          ticketerId: data.ticketerId ?? null,
          agentId: null,
          source: data.source ?? 'web',
          type: data.type ?? 'individual',
          passengerName: data.passengerName,
          passengerPhone: data.passengerPhone,
          passengerEmail: data.passengerEmail ?? null,
          boardingStopId: data.boardingStopId,
          alightingStopId: data.alightingStopId,
          boardingStopOrder: boardingStop.stopOrder,
          alightingStopOrder: alightingStop.stopOrder,
          seatCount: data.seatIds.length,
          totalAmount,
          currency: priceResult.currency,
          status: 'confirmed',
          qrCodeData: qrData,
          checkedInAt: null,
          checkedOutAt: null,
          cancellationReason: null,
          cancelledById: null,
          offlineId: data.offlineId ?? null,
          syncedAt: data.offlineId ? DateTime.utc() : null,
        },
        { client: trx }
      )

      // 11. Create booking_seats records
      const bookingSeatsData = data.seatIds.map((seatId) => ({
        bookingId: booking.id,
        tripSeatId: seatId,
        passengerName: null as string | null,
      }))

      await BookingSeat.createMany(bookingSeatsData, { client: trx })

      return booking
    })
  }

  /**
   * Reserve seats for a specific segment (5-minute hold).
   * Checks availability first, rejects if any seat is occupied for the segment.
   */
  async reserveSeats(params: ReserveSeatParams): Promise<SeatReservation[]> {
    const { tripId, seatIds, boardingStopOrder, alightingStopOrder, userId } = params

    // Check availability
    const availableSeats = await availabilityService.getAvailableSeats(
      tripId,
      boardingStopOrder,
      alightingStopOrder
    )
    const availableIds = new Set(availableSeats.map((s) => s.id))

    const unavailable = seatIds.filter((id) => !availableIds.has(id))
    if (unavailable.length > 0) {
      throw new Error(
        `E_SEATS_UNAVAILABLE: Seats ${unavailable.join(', ')} are not available for this segment`
      )
    }

    const reservedUntil = DateTime.utc().plus({ minutes: 5 })

    const reservations = await SeatReservation.createMany(
      seatIds.map((seatId) => ({
        tripId,
        tripSeatId: seatId,
        userId: userId ?? null,
        boardingStopOrder,
        alightingStopOrder,
        reservedUntil,
      }))
    )

    return reservations
  }

  /**
   * Cancel a booking and record the reason.
   * Availability is reclaimed automatically (cancelled bookings excluded from overlap check).
   */
  async cancel(bookingId: number, reason: string, cancelledById: number): Promise<Booking> {
    const booking = await Booking.findOrFail(bookingId)

    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      throw new Error('E_ALREADY_CANCELLED: Booking is already cancelled or refunded')
    }

    booking.status = 'cancelled'
    booking.cancellationReason = reason
    booking.cancelledById = cancelledById
    await booking.save()

    return booking
  }

  /**
   * Check in a passenger at the boarding stop.
   */
  async checkIn(bookingId: number): Promise<Booking> {
    const booking = await Booking.findOrFail(bookingId)

    if (booking.status !== 'confirmed') {
      throw new Error(
        `E_INVALID_STATUS: Booking must be in 'confirmed' status to check in (current: ${booking.status})`
      )
    }

    booking.status = 'checked_in'
    booking.checkedInAt = DateTime.utc()
    await booking.save()

    return booking
  }

  /**
   * Check out a passenger at the alighting stop.
   */
  async checkOut(bookingId: number): Promise<Booking> {
    const booking = await Booking.findOrFail(bookingId)

    if (booking.status !== 'checked_in') {
      throw new Error(
        `E_INVALID_STATUS: Booking must be in 'checked_in' status to check out (current: ${booking.status})`
      )
    }

    booking.status = 'completed'
    booking.checkedOutAt = DateTime.utc()
    await booking.save()

    return booking
  }

  /**
   * Sync a batch of offline-created bookings.
   * Uses offline_id for idempotency — skips already-synced bookings.
   */
  async syncOfflineBookings(bookings: OfflineBookingInput[]): Promise<SyncResult> {
    const result: SyncResult = { synced: [], conflicts: [], errors: [] }

    for (const input of bookings) {
      try {
        // Idempotency: check if already synced
        const existing = await Booking.query().where('offline_id', input.offlineId).first()
        if (existing) {
          result.synced.push(existing)
          continue
        }

        const booking = await this.create(input)
        result.synced.push(booking)
      } catch (err: any) {
        const message: string = err?.message ?? String(err)

        if (
          message.includes('E_SEATS_UNAVAILABLE') ||
          message.includes('E_CAPACITY_EXCEEDED')
        ) {
          result.conflicts.push({ offlineId: input.offlineId, reason: message })
        } else {
          result.errors.push({ offlineId: input.offlineId, error: message })
        }
      }
    }

    return result
  }

  /**
   * Generate a unique booking code in the format SP-XXXXXXXX.
   */
  private generateBookingCode(): string {
    return 'SP-' + randomBytes(4).toString('hex').toUpperCase()
  }
}
