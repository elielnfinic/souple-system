import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import FleetBooking from '#models/fleet_booking'
import type { FleetBookingType } from '#models/fleet_booking'

export interface CreateFleetBookingData {
  organizationId?: number
  vehicleId: number
  userId: number
  driverUserId?: number
  type: FleetBookingType
  title: string
  description?: string
  startAt: DateTime
  endAt: DateTime
  pickupLocation: string
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffLocation?: string
  dropoffLatitude?: number
  dropoffLongitude?: number
  totalAmount: number
  currency?: string
  notes?: string
}

export interface UpdateFleetBookingData {
  driverUserId?: number
  title?: string
  description?: string
  startAt?: DateTime
  endAt?: DateTime
  pickupLocation?: string
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffLocation?: string
  dropoffLatitude?: number
  dropoffLongitude?: number
  totalAmount?: number
  currency?: string
  notes?: string
}

export class FleetBookingService {
  /**
   * Create a fleet booking. Checks vehicle availability (no overlapping bookings).
   */
  async create(data: CreateFleetBookingData): Promise<FleetBooking> {
    // Check for overlapping fleet bookings for the same vehicle
    const overlap = await FleetBooking.query()
      .where('vehicle_id', data.vehicleId)
      .whereNotIn('status', ['cancelled'])
      .where((q) => {
        q.where((inner) => {
          // New booking starts during an existing one
          inner
            .where('start_at', '<=', data.startAt.toSQL()!)
            .where('end_at', '>', data.startAt.toSQL()!)
        }).orWhere((inner) => {
          // New booking ends during an existing one
          inner
            .where('start_at', '<', data.endAt.toSQL()!)
            .where('end_at', '>=', data.endAt.toSQL()!)
        }).orWhere((inner) => {
          // New booking entirely contains an existing one
          inner
            .where('start_at', '>=', data.startAt.toSQL()!)
            .where('end_at', '<=', data.endAt.toSQL()!)
        })
      })
      .first()

    if (overlap) {
      throw new Error(
        `E_VEHICLE_UNAVAILABLE: Vehicle is already booked from ${overlap.startAt.toISO()} to ${overlap.endAt.toISO()}`
      )
    }

    const bookingCode = this.generateBookingCode()

    return await FleetBooking.create({
      bookingCode,
      organizationId: data.organizationId ?? null,
      vehicleId: data.vehicleId,
      userId: data.userId,
      driverUserId: data.driverUserId ?? null,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      startAt: data.startAt,
      endAt: data.endAt,
      pickupLocation: data.pickupLocation,
      pickupLatitude: data.pickupLatitude ?? null,
      pickupLongitude: data.pickupLongitude ?? null,
      dropoffLocation: data.dropoffLocation ?? null,
      dropoffLatitude: data.dropoffLatitude ?? null,
      dropoffLongitude: data.dropoffLongitude ?? null,
      totalAmount: data.totalAmount,
      currency: data.currency ?? 'CDF',
      status: 'pending',
      notes: data.notes ?? null,
    })
  }

  /**
   * Update mutable fields of a fleet booking.
   */
  async update(bookingId: number, data: UpdateFleetBookingData): Promise<FleetBooking> {
    const booking = await FleetBooking.findOrFail(bookingId)

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new Error('E_INVALID_STATUS: Cannot update a cancelled or completed booking')
    }

    if (data.driverUserId !== undefined) booking.driverUserId = data.driverUserId
    if (data.title !== undefined) booking.title = data.title
    if (data.description !== undefined) booking.description = data.description
    if (data.startAt !== undefined) booking.startAt = data.startAt
    if (data.endAt !== undefined) booking.endAt = data.endAt
    if (data.pickupLocation !== undefined) booking.pickupLocation = data.pickupLocation
    if (data.pickupLatitude !== undefined) booking.pickupLatitude = data.pickupLatitude
    if (data.pickupLongitude !== undefined) booking.pickupLongitude = data.pickupLongitude
    if (data.dropoffLocation !== undefined) booking.dropoffLocation = data.dropoffLocation
    if (data.dropoffLatitude !== undefined) booking.dropoffLatitude = data.dropoffLatitude
    if (data.dropoffLongitude !== undefined) booking.dropoffLongitude = data.dropoffLongitude
    if (data.totalAmount !== undefined) booking.totalAmount = data.totalAmount
    if (data.currency !== undefined) booking.currency = data.currency
    if (data.notes !== undefined) booking.notes = data.notes

    await booking.save()
    return booking
  }

  /**
   * Cancel a fleet booking.
   */
  async cancel(bookingId: number): Promise<FleetBooking> {
    const booking = await FleetBooking.findOrFail(bookingId)

    if (booking.status === 'cancelled') {
      throw new Error('E_ALREADY_CANCELLED: Booking is already cancelled')
    }

    if (booking.status === 'completed') {
      throw new Error('E_INVALID_STATUS: Cannot cancel a completed booking')
    }

    booking.status = 'cancelled'
    await booking.save()

    return booking
  }

  /**
   * Confirm a fleet booking (org side acceptance).
   */
  async confirm(bookingId: number): Promise<FleetBooking> {
    const booking = await FleetBooking.findOrFail(bookingId)

    if (booking.status !== 'pending') {
      throw new Error(
        `E_INVALID_STATUS: Only pending bookings can be confirmed (current: ${booking.status})`
      )
    }

    booking.status = 'confirmed'
    await booking.save()

    return booking
  }

  /**
   * Generate a unique fleet booking code in the format FL-XXXXXXXX.
   */
  private generateBookingCode(): string {
    return 'FL-' + randomBytes(4).toString('hex').toUpperCase()
  }
}
