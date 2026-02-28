import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import FleetBooking from '#models/fleet_booking'
import { FleetBookingService } from '#services/fleet_booking_service'
import { fleetBookingValidator, updateFleetBookingValidator } from '#validators/booking_validator'

const fleetBookingService = new FleetBookingService()

export default class FleetBookingsController {
  /**
   * GET /api/v1/fleet-bookings
   * List fleet bookings — user's own, or org-scoped for managers.
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const status = request.input('status')
    const vehicleId = request.input('vehicle_id')

    const query = FleetBooking.query()
      .preload('vehicle')
      .preload('user')
      .orderBy('start_at', 'asc')

    if (user.isSuperAdmin) {
      // no filter
    } else if (ctx.organization) {
      query.where('organization_id', ctx.organization.id)
    } else {
      query.where('user_id', user.id)
    }

    if (status) query.where('status', status)
    if (vehicleId) query.where('vehicle_id', vehicleId)

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
   * POST /api/v1/fleet-bookings
   * Create a fleet booking.
   */
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(fleetBookingValidator)

    const startAt = DateTime.fromISO(data.startAt, { zone: 'utc' })
    const endAt = DateTime.fromISO(data.endAt, { zone: 'utc' })

    if (!startAt.isValid || !endAt.isValid) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Invalid start_at or end_at datetime format' },
      })
    }

    if (endAt <= startAt) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'end_at must be after start_at' },
      })
    }

    try {
      const booking = await fleetBookingService.create({
        organizationId: ctx.organization?.id,
        vehicleId: data.vehicleId,
        userId: user.id,
        driverUserId: data.driverUserId,
        type: data.type,
        title: data.title,
        description: data.description,
        startAt,
        endAt,
        pickupLocation: data.pickupLocation,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        dropoffLocation: data.dropoffLocation,
        dropoffLatitude: data.dropoffLatitude,
        dropoffLongitude: data.dropoffLongitude,
        totalAmount: data.totalAmount,
        currency: data.currency,
        notes: data.notes,
      })

      return response.created({ success: true, data: booking })
    } catch (err: any) {
      if (err?.message?.startsWith('E_VEHICLE_UNAVAILABLE')) {
        return response.conflict({
          success: false,
          error: { code: 'E_VEHICLE_UNAVAILABLE', message: err.message },
        })
      }

      return response.internalServerError({
        success: false,
        error: { code: 'E_INTERNAL', message: 'Failed to create fleet booking' },
      })
    }
  }

  /**
   * GET /api/v1/fleet-bookings/:id
   * Fleet booking details.
   */
  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const booking = await FleetBooking.query()
      .where('id', params.id)
      .preload('vehicle')
      .preload('user')
      .preload('driver')
      .firstOrFail()

    // Authorization
    if (!user.isSuperAdmin) {
      const isOwner = booking.userId === user.id
      const isOrgMember = ctx.organization && booking.organizationId === ctx.organization.id

      if (!isOwner && !isOrgMember) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this fleet booking' },
        })
      }
    }

    return response.ok({ success: true, data: booking })
  }

  /**
   * PUT /api/v1/fleet-bookings/:id
   * Update a fleet booking.
   */
  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user!

    const booking = await FleetBooking.findOrFail(params.id)

    // Authorization
    if (!user.isSuperAdmin) {
      const isOwner = booking.userId === user.id
      const isOrgMember = ctx.organization && booking.organizationId === ctx.organization.id

      if (!isOwner && !isOrgMember) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to update this fleet booking' },
        })
      }
    }

    const data = await request.validateUsing(updateFleetBookingValidator)

    const updateData: Parameters<typeof fleetBookingService.update>[1] = {}

    if (data.driverUserId !== undefined) updateData.driverUserId = data.driverUserId
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.pickupLocation !== undefined) updateData.pickupLocation = data.pickupLocation
    if (data.pickupLatitude !== undefined) updateData.pickupLatitude = data.pickupLatitude
    if (data.pickupLongitude !== undefined) updateData.pickupLongitude = data.pickupLongitude
    if (data.dropoffLocation !== undefined) updateData.dropoffLocation = data.dropoffLocation
    if (data.dropoffLatitude !== undefined) updateData.dropoffLatitude = data.dropoffLatitude
    if (data.dropoffLongitude !== undefined) updateData.dropoffLongitude = data.dropoffLongitude
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.notes !== undefined) updateData.notes = data.notes

    if (data.startAt) {
      const dt = DateTime.fromISO(data.startAt, { zone: 'utc' })
      if (dt.isValid) updateData.startAt = dt
    }

    if (data.endAt) {
      const dt = DateTime.fromISO(data.endAt, { zone: 'utc' })
      if (dt.isValid) updateData.endAt = dt
    }

    try {
      const updated = await fleetBookingService.update(booking.id, updateData)
      return response.ok({ success: true, data: updated })
    } catch (err: any) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATUS', message: err?.message ?? 'Cannot update booking' },
      })
    }
  }

  /**
   * POST /api/v1/fleet-bookings/:id/cancel
   * Cancel a fleet booking.
   */
  async cancel(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const booking = await FleetBooking.findOrFail(params.id)

    // Authorization
    if (!user.isSuperAdmin) {
      const isOwner = booking.userId === user.id
      const isOrgMember = ctx.organization && booking.organizationId === ctx.organization.id

      if (!isOwner && !isOrgMember) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to cancel this fleet booking' },
        })
      }
    }

    try {
      const cancelled = await fleetBookingService.cancel(booking.id)
      return response.ok({ success: true, data: cancelled })
    } catch (err: any) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATUS', message: err?.message ?? 'Cannot cancel booking' },
      })
    }
  }

  /**
   * POST /api/v1/fleet-bookings/:id/confirm
   * Confirm a fleet booking (org side acceptance).
   */
  async confirm(ctx: HttpContext) {
    const { params, response } = ctx

    try {
      const confirmed = await fleetBookingService.confirm(parseInt(params.id, 10))
      return response.ok({ success: true, data: confirmed })
    } catch (err: any) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STATUS', message: err?.message ?? 'Cannot confirm booking' },
      })
    }
  }
}
