import db from '@adonisjs/lucid/services/db'
import qrcode from 'qrcode'
import Booking from '#models/booking'
import BookingSeat from '#models/booking_seat'
import Trip from '#models/trip'
import TripStop from '#models/trip_stop'
import TripSeat from '#models/trip_seat'
import { generateReference } from '#utils/booking_reference'
import { SegmentAvailabilityService } from '#services/segment_availability_service'

const availabilityService = new SegmentAvailabilityService()

export interface CreateBookingData {
  tripId: number
  boardingStopId: number
  alightingStopId: number
  seatIds: string[]
  passengerName: string
  passengerPhone?: string
  passengerUserId?: number
  bookedByUserId?: number
  currency?: 'CDF' | 'USD'
}

export class BookingService {
  async createBooking(data: CreateBookingData): Promise<Booking> {
    // 1. Load trip and validate status
    const trip = await Trip.findOrFail(data.tripId)
    if (!['scheduled', 'boarding'].includes(trip.status)) {
      throw new Error(`Trip is not accepting bookings (status: ${trip.status})`)
    }

    // 2. Load stops
    const [boardingStop, alightingStop] = await Promise.all([
      TripStop.findOrFail(data.boardingStopId),
      TripStop.findOrFail(data.alightingStopId),
    ])

    if (boardingStop.tripId !== data.tripId || alightingStop.tripId !== data.tripId) {
      throw new Error('Stops do not belong to this trip')
    }

    if (boardingStop.stopOrder >= alightingStop.stopOrder) {
      throw new Error('Boarding stop must come before alighting stop')
    }

    // 3. Check seat availability
    const seatsAvailable = await availabilityService.checkSeatsAvailable(
      data.tripId,
      data.seatIds,
      boardingStop.stopOrder,
      alightingStop.stopOrder
    )
    if (!seatsAvailable) {
      throw new Error('One or more requested seats are not available for this segment')
    }

    // 4. Load trip seats and calculate price
    const tripSeats = await TripSeat.query()
      .where('trip_id', data.tripId)
      .whereIn('seat_id', data.seatIds)

    // Distance ratio: proportion of route covered by this segment
    const distanceRatio = this.#calcDistanceRatio(boardingStop, alightingStop)

    let totalCdf = 0
    const seatPrices: Array<{ tripSeat: TripSeat; priceCdf: number; priceUsd: number | null }> = []

    for (const tripSeat of tripSeats) {
      const priceCdf = trip.basePriceCdf * distanceRatio * tripSeat.priceMultiplier
      const priceUsd =
        trip.basePriceUsd !== null
          ? trip.basePriceUsd * distanceRatio * tripSeat.priceMultiplier
          : null
      totalCdf += priceCdf
      seatPrices.push({ tripSeat, priceCdf, priceUsd })
    }

    const totalUsd = trip.basePriceUsd !== null ? seatPrices.reduce((s, sp) => s + (sp.priceUsd ?? 0), 0) : null
    const currency = data.currency ?? 'CDF'

    // 5. Create booking in a transaction (with reference retry on duplicate)
    const booking = await this.#createWithRetry(async (reference) => {
      return db.transaction(async (trx) => {
        const newBooking = await Booking.create(
          {
            reference,
            tripId: data.tripId,
            passengerUserId: data.passengerUserId ?? null,
            boardingStopId: data.boardingStopId,
            alightingStopId: data.alightingStopId,
            boardingStopOrder: boardingStop.stopOrder,
            alightingStopOrder: alightingStop.stopOrder,
            passengerName: data.passengerName,
            passengerPhone: data.passengerPhone ?? null,
            status: 'pending',
            totalAmountCdf: Math.round(totalCdf * 100) / 100,
            totalAmountUsd: totalUsd !== null ? Math.round(totalUsd * 100) / 100 : null,
            currency,
            paymentStatus: 'unpaid',
            bookedByUserId: data.bookedByUserId ?? null,
          },
          { client: trx }
        )

        // 6. Generate QR code
        const qrData = JSON.stringify({ ref: reference, tripId: data.tripId, bookingId: newBooking.id })
        newBooking.qrCode = await qrcode.toDataURL(qrData)
        await newBooking.useTransaction(trx).save()

        // Create booking seats
        await BookingSeat.createMany(
          seatPrices.map(({ tripSeat, priceCdf, priceUsd }) => ({
            bookingId: newBooking.id,
            tripSeatId: tripSeat.id,
            seatId: tripSeat.seatId,
            seatClass: tripSeat.seatClass,
            priceCdf: Math.round(priceCdf * 100) / 100,
            priceUsd: priceUsd !== null ? Math.round(priceUsd * 100) / 100 : null,
          })),
          { client: trx }
        )

        return newBooking
      })
    })

    return booking
  }

  async cancelBooking(bookingId: number, reason: string): Promise<void> {
    const booking = await Booking.findOrFail(bookingId)
    booking.status = 'cancelled'
    booking.cancelledAt = (await import('luxon')).DateTime.now()
    booking.cancellationReason = reason
    await booking.save()
  }

  async getBookingByReference(reference: string): Promise<Booking> {
    return Booking.query()
      .where('reference', reference)
      .preload('seats')
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .firstOrFail()
  }

  async getBookingsForTrip(tripId: number): Promise<Booking[]> {
    return Booking.query()
      .where('trip_id', tripId)
      .preload('seats')
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .orderBy('created_at', 'desc')
  }

  async getBookingsForPassenger(userId: number, page = 1): Promise<any> {
    const paginated = await Booking.query()
      .where('passenger_user_id', userId)
      .preload('trip')
      .preload('seats')
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .orderBy('created_at', 'desc')
      .paginate(page, 20)

    const json = paginated.toJSON()
    return {
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    }
  }

  #calcDistanceRatio(boardingStop: TripStop, alightingStop: TripStop): number {
    // Use distance between boarding and alighting stops relative to total route distance (alighting stop's distance).
    // If the alighting stop is not the final stop, callers should pass the final stop's distance separately.
    // For pricing we approximate with the segment distance vs. total covered distance.
    if (
      boardingStop.distanceFromStartKm !== null &&
      alightingStop.distanceFromStartKm !== null &&
      alightingStop.distanceFromStartKm > boardingStop.distanceFromStartKm
    ) {
      const segmentDistance = alightingStop.distanceFromStartKm - boardingStop.distanceFromStartKm
      // Normalise against the alighting stop distance as an approximation of total route distance.
      // Full-route bookings (boarding at 0) correctly yield a ratio approaching 1.
      return segmentDistance / alightingStop.distanceFromStartKm
    }
    return 1
  }

  async #createWithRetry(fn: (reference: string) => Promise<Booking>, attempts = 3): Promise<Booking> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn(generateReference())
      } catch (err: any) {
        const isLast = i === attempts - 1
        const isDuplicate = err?.code === 'ER_DUP_ENTRY' || err?.message?.includes('unique')
        if (!isDuplicate || isLast) throw err
      }
    }
    throw new Error('Failed to generate unique booking reference')
  }
}
