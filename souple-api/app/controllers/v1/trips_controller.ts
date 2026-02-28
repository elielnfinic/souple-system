import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { TripService } from '#services/trip_service'
import { SegmentAvailabilityService } from '#services/segment_availability_service'
import { createTripValidator, updateTripValidator, searchTripValidator } from '#validators/trip_validator'
import TripStop from '#models/trip_stop'

const tripService = new TripService()
const availabilityService = new SegmentAvailabilityService()

export default class TripsController {
  /**
   * GET /api/v1/trips
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const orgId = request.input('org_id')

    const result = await tripService.list({
      orgId: orgId ? Number(orgId) : undefined,
      page: Number(page),
      limit: Number(limit),
    })

    return response.ok({ success: true, ...result })
  }

  /**
   * GET /api/v1/trips/:id
   */
  async show({ params, response }: HttpContext) {
    const trip = await tripService.findOrFail(Number(params.id))
    return response.ok({ success: true, data: trip })
  }

  /**
   * POST /api/v1/trips
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(createTripValidator)
    const orgId = request.input('organization_id')

    const trip = await tripService.create({
      ...data,
      organizationId: orgId ? Number(orgId) : undefined,
      driverUserId: data.driverUserId ?? user.id,
    })

    return response.created({ success: true, data: trip })
  }

  /**
   * PUT /api/v1/trips/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const trip = await tripService.findOrFail(Number(params.id))

    if (!user.isSuperAdmin && trip.organizationId === null && trip.driverUserId !== user.id) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Not authorized to update this trip' },
      })
    }

    const data = await request.validateUsing(updateTripValidator)
    const { departureAt, ...rest } = data
    trip.merge(rest)
    if (departureAt) trip.departureAt = DateTime.fromISO(departureAt)
    await trip.save()

    return response.ok({ success: true, data: trip })
  }

  /**
   * DELETE /api/v1/trips/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const trip = await tripService.findOrFail(Number(params.id))

    if (!user.isSuperAdmin && trip.driverUserId !== user.id) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Not authorized to cancel this trip' },
      })
    }

    await tripService.updateStatus(Number(params.id), 'cancelled')
    return response.ok({ success: true, data: { message: 'Trip cancelled' } })
  }

  /**
   * GET /api/v1/trips/search
   */
  async search({ request, response }: HttpContext) {
    const data = await request.validateUsing(searchTripValidator)
    const result = await tripService.search(data)
    return response.ok({ success: true, ...result })
  }

  /**
   * GET /api/v1/trips/:id/availability?boarding_stop_id=X&alighting_stop_id=Y
   */
  async availability({ params, request, response }: HttpContext) {
    const boardingStopId = Number(request.input('boarding_stop_id'))
    const alightingStopId = Number(request.input('alighting_stop_id'))

    if (!boardingStopId || !alightingStopId) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'boarding_stop_id and alighting_stop_id are required' },
      })
    }

    const [boardingStop, alightingStop] = await Promise.all([
      TripStop.findOrFail(boardingStopId),
      TripStop.findOrFail(alightingStopId),
    ])

    const map = await availabilityService.getSeatAvailabilityMap(
      Number(params.id),
      boardingStop.stopOrder,
      alightingStop.stopOrder
    )

    return response.ok({
      success: true,
      data: map.map(({ seat, isAvailable }) => ({ ...seat.serialize(), isAvailable })),
    })
  }

  /**
   * GET /api/v1/trips/:id/manifest
   */
  async manifest({ params, response }: HttpContext) {
    const result = await tripService.getDriverManifest(Number(params.id))
    return response.ok({ success: true, data: result })
  }
}
