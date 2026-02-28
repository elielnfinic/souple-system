import type { HttpContext } from '@adonisjs/core/http'
import { BookingService } from '#services/booking_service'
import { createBookingValidator } from '#validators/booking_validator'
import Booking from '#models/booking'

const bookingService = new BookingService()

export default class BookingsController {
  /**
   * GET /api/v1/bookings
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = Number(request.input('page', 1))
    const tripId = request.input('trip_id')

    if (tripId) {
      const bookings = await bookingService.getBookingsForTrip(Number(tripId))
      return response.ok({ success: true, data: bookings })
    }

    const result = await bookingService.getBookingsForPassenger(user.id, page)
    return response.ok({ success: true, ...result })
  }

  /**
   * GET /api/v1/bookings/:id
   */
  async show({ params, response }: HttpContext) {
    const booking = await Booking.query()
      .where('id', Number(params.id))
      .preload('seats')
      .preload('trip')
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .firstOrFail()

    return response.ok({ success: true, data: booking })
  }

  /**
   * POST /api/v1/bookings
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(createBookingValidator)

    const booking = await bookingService.createBooking({
      ...data,
      passengerUserId: user.id,
      bookedByUserId: user.id,
    })

    return response.created({ success: true, data: booking })
  }

  /**
   * PUT /api/v1/bookings/:id/cancel
   */
  async cancel({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const booking = await Booking.findOrFail(Number(params.id))

    if (!user.isSuperAdmin && booking.passengerUserId !== user.id && booking.bookedByUserId !== user.id) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Not authorized to cancel this booking' },
      })
    }

    if (['cancelled', 'completed', 'boarded'].includes(booking.status)) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATE', message: `Cannot cancel a booking with status: ${booking.status}` },
      })
    }

    const reason = request.input('reason', 'Cancelled by user')
    await bookingService.cancelBooking(Number(params.id), reason)

    return response.ok({ success: true, data: { message: 'Booking cancelled' } })
  }
}
