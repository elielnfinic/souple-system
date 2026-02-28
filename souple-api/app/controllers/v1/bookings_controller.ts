import type { HttpContext } from '@adonisjs/core/http'
import Booking from '#models/booking'
import SeatReservation from '#models/seat_reservation'
import { BookingService } from '#services/booking_service'
import { TicketService } from '#services/ticket_service'
import {
  createBookingValidator,
  cancelBookingValidator,
  reserveSeatValidator,
  syncOfflineValidator,
} from '#validators/booking_validator'

const bookingService = new BookingService()
const ticketService = new TicketService()

export default class BookingsController {
  /**
   * GET /api/v1/bookings
   * List bookings — user's own, or org-scoped for managers.
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const status = request.input('status')
    const tripId = request.input('trip_id')

    const query = Booking.query()
      .preload('trip')
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .preload('bookingSeats', (q) => q.preload('tripSeat'))
      .orderBy('created_at', 'desc')

    // Super admin: all bookings
    if (user.isSuperAdmin) {
      // no filter
    } else if (ctx.organization) {
      // Org members see all org bookings
      query.where('organization_id', ctx.organization.id)
    } else {
      // Regular user: only their own bookings
      query.where('user_id', user.id)
    }

    if (status) query.where('status', status)
    if (tripId) query.where('trip_id', tripId)

    const paginated = await query.paginate(page, perPage)
    const json = paginated.toJSON()

    return response.ok({
      success: true,
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    })
  }

  /**
   * POST /api/v1/bookings
   * Create a booking for a specific trip segment.
   */
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(createBookingValidator)

    try {
      const booking = await bookingService.create({
        tripId: data.tripId,
        boardingStopId: data.boardingStopId,
        alightingStopId: data.alightingStopId,
        seatIds: data.seatIds,
        passengerName: data.passengerName,
        passengerPhone: data.passengerPhone,
        passengerEmail: data.passengerEmail,
        source: data.source,
        type: data.type,
        userId: user.id,
        organizationId: ctx.organization?.id,
      })

      return response.created({ success: true, data: booking })
    } catch (err: any) {
      const message: string = err?.message ?? String(err)

      if (message.startsWith('E_CAPACITY_EXCEEDED')) {
        return response.conflict({
          success: false,
          error: { code: 'E_CAPACITY_EXCEEDED', message },
        })
      }

      if (message.startsWith('E_SEATS_UNAVAILABLE')) {
        return response.conflict({
          success: false,
          error: { code: 'E_SEATS_UNAVAILABLE', message },
        })
      }

      if (message.startsWith('E_INVALID_STOPS') || message.startsWith('E_BOARDING_DISABLED') || message.startsWith('E_ALIGHTING_DISABLED')) {
        return response.badRequest({
          success: false,
          error: { code: 'E_VALIDATION', message },
        })
      }

      return response.internalServerError({
        success: false,
        error: { code: 'E_INTERNAL', message: 'Failed to create booking' },
      })
    }
  }

  /**
   * GET /api/v1/bookings/:id
   * Booking details with full segment info.
   */
  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const booking = await Booking.query()
      .where('id', params.id)
      .preload('trip', (q) => q.preload('vehicle').preload('route'))
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .preload('bookingSeats', (q) => q.preload('tripSeat'))
      .firstOrFail()

    // Authorization: own booking, org member, or super admin
    if (!user.isSuperAdmin) {
      const isOwnBooking = booking.userId === user.id
      const isOrgMember = ctx.organization && booking.organizationId === ctx.organization.id
      const isTicketer = booking.ticketerId === user.id

      if (!isOwnBooking && !isOrgMember && !isTicketer) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this booking' },
        })
      }
    }

    return response.ok({ success: true, data: booking })
  }

  /**
   * POST /api/v1/bookings/:id/cancel
   * Cancel a booking.
   */
  async cancel(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user!

    const booking = await Booking.findOrFail(params.id)
    const data = await request.validateUsing(cancelBookingValidator)

    // Authorization
    if (!user.isSuperAdmin) {
      const isOwnBooking = booking.userId === user.id
      const isOrgMember = ctx.organization && booking.organizationId === ctx.organization.id
      const isTicketer = booking.ticketerId === user.id

      if (!isOwnBooking && !isOrgMember && !isTicketer) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to cancel this booking' },
        })
      }
    }

    try {
      const cancelled = await bookingService.cancel(booking.id, data.reason, user.id)
      return response.ok({ success: true, data: cancelled })
    } catch (err: any) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATUS', message: err?.message ?? 'Cannot cancel booking' },
      })
    }
  }

  /**
   * POST /api/v1/bookings/:id/check-in
   * Check in a passenger at the boarding stop.
   */
  async checkIn(ctx: HttpContext) {
    const { params, response } = ctx

    try {
      const booking = await bookingService.checkIn(parseInt(params.id, 10))
      return response.ok({ success: true, data: booking })
    } catch (err: any) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATUS', message: err?.message ?? 'Check-in failed' },
      })
    }
  }

  /**
   * POST /api/v1/bookings/:id/check-out
   * Check out a passenger at the alighting stop.
   */
  async checkOut(ctx: HttpContext) {
    const { params, response } = ctx

    try {
      const booking = await bookingService.checkOut(parseInt(params.id, 10))
      return response.ok({ success: true, data: booking })
    } catch (err: any) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATUS', message: err?.message ?? 'Check-out failed' },
      })
    }
  }

  /**
   * GET /api/v1/bookings/:id/ticket
   * Structured ticket data for print/display. QR code string included.
   */
  async ticket(ctx: HttpContext) {
    const { params, response } = ctx

    const ticketData = await ticketService.generateTicketData(parseInt(params.id, 10))

    return response.ok({ success: true, data: ticketData })
  }

  /**
   * GET /api/v1/bookings/track/:code
   * Public endpoint — track a booking by its booking code without authentication.
   */
  async track(ctx: HttpContext) {
    const { params, response } = ctx

    const booking = await Booking.query()
      .where('booking_code', params.code.toUpperCase())
      .preload('trip', (q) => q.preload('route'))
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .firstOrFail()

    // Public endpoint — return limited safe fields only
    return response.ok({
      success: true,
      data: {
        bookingCode: booking.bookingCode,
        passengerName: booking.passengerName,
        status: booking.status,
        boardingCity: booking.boardingStop?.city?.name,
        alightingCity: booking.alightingStop?.city?.name,
        departureAt: booking.trip?.departureAt?.toISO(),
        seatCount: booking.seatCount,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        checkedInAt: booking.checkedInAt?.toISO() ?? null,
        checkedOutAt: booking.checkedOutAt?.toISO() ?? null,
      },
    })
  }

  /**
   * POST /api/v1/trips/:tripId/seats/reserve
   * Reserve seats for a specific segment (5-minute hold).
   */
  async reserveSeats(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user

    const data = await request.validateUsing(reserveSeatValidator)

    if (data.boardingStopOrder >= data.alightingStopOrder) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'alighting_stop_order must be greater than boarding_stop_order',
        },
      })
    }

    try {
      const reservations = await bookingService.reserveSeats({
        tripId: parseInt(params.tripId, 10),
        seatIds: data.seatIds,
        boardingStopOrder: data.boardingStopOrder,
        alightingStopOrder: data.alightingStopOrder,
        userId: user?.id,
      })

      return response.created({ success: true, data: reservations })
    } catch (err: any) {
      return response.conflict({
        success: false,
        error: { code: 'E_SEATS_UNAVAILABLE', message: err?.message ?? 'Seats unavailable' },
      })
    }
  }

  /**
   * DELETE /api/v1/trips/:tripId/seats/reserve/:id
   * Release a seat reservation.
   */
  async releaseReservation(ctx: HttpContext) {
    const { params, response } = ctx

    const reservation = await SeatReservation.findOrFail(params.id)

    if (reservation.tripId !== parseInt(params.tripId, 10)) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID', message: 'Reservation does not belong to this trip' },
      })
    }

    await reservation.delete()

    return response.ok({ success: true, data: { message: 'Reservation released' } })
  }

  /**
   * POST /api/v1/bookings/sync
   * Sync a batch of offline-created bookings.
   */
  async sync(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(syncOfflineValidator)

    const inputBookings = data.bookings.map((b: any) => ({
      ...b,
      userId: user.id,
      organizationId: ctx.organization?.id,
      source: b.source ?? 'pos',
      type: b.type ?? 'individual',
    }))

    const result = await bookingService.syncOfflineBookings(inputBookings)

    return response.ok({ success: true, data: result })
  }
}
