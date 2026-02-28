import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Trip from '#models/trip'
import TripStop from '#models/trip_stop'
import { TripService } from '#services/trip_service'
import { SeatAvailabilityService } from '#services/seat_availability_service'
import {
  createTripValidator,
  updateTripValidator,
  updateTripStopValidator,
} from '#validators/trip_validator'

const tripService = new TripService()
const availabilityService = new SeatAvailabilityService()

export default class TripsController {
  /**
   * GET /api/v1/trips
   * List trips — org-scoped for authenticated users, or public upcoming trips.
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const status = request.input('status')
    const routeId = request.input('route_id')
    const date = request.input('date') // YYYY-MM-DD

    const query = Trip.query()
      .preload('vehicle')
      .preload('driver')
      .preload('route')
      .orderBy('departure_at', 'asc')

    if (ctx.auth.isAuthenticated && ctx.organization) {
      query.where('organization_id', ctx.organization.id)
    } else {
      // Public: only scheduled or boarding trips
      query.whereIn('status', ['scheduled', 'boarding'])
    }

    if (status) query.where('status', status)
    if (routeId) query.where('route_id', routeId)
    if (date) {
      query
        .where('departure_at', '>=', `${date} 00:00:00`)
        .where('departure_at', '<=', `${date} 23:59:59`)
    }

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
   * POST /api/v1/trips
   * Create a trip — materializes stops and seats from the route/layout.
   * Requires: org_admin, manager, or super_admin.
   */
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(createTripValidator)

    const departureAt = DateTime.fromISO(data.departureAt, { zone: 'utc' })
    if (!departureAt.isValid) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Invalid departure_at datetime format' },
      })
    }

    let estimatedArrivalAt: DateTime | undefined
    if (data.estimatedArrivalAt) {
      estimatedArrivalAt = DateTime.fromISO(data.estimatedArrivalAt, { zone: 'utc' })
      if (!estimatedArrivalAt.isValid) {
        return response.badRequest({
          success: false,
          error: { code: 'E_VALIDATION', message: 'Invalid estimated_arrival_at datetime format' },
        })
      }
    }

    const orgId = ctx.organization?.id

    const trip = await tripService.create({
      organizationId: orgId,
      vehicleId: data.vehicleId,
      driverUserId: data.driverUserId,
      routeId: data.routeId,
      seatLayoutId: data.seatLayoutId,
      departureAt,
      estimatedArrivalAt,
      notes: data.notes,
      allowIntermediateBoarding: data.allowIntermediateBoarding,
      isRecurring: data.isRecurring,
      recurrenceRule: data.recurrenceRule,
    })

    return response.created({ success: true, data: trip })
  }

  /**
   * GET /api/v1/trips/search
   * Public search for trips by city pair and date.
   */
  async search(ctx: HttpContext) {
    const { request, response } = ctx

    const fromCityId = request.input('from')
    const toCityId = request.input('to')
    const date = request.input('date')
    const seatCount = parseInt(request.input('seats', '1'), 10)
    const page = parseInt(request.input('page', '1'), 10)
    const perPage = Math.min(parseInt(request.input('per_page', '20'), 10), 100)

    if (!fromCityId || !toCityId || !date) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'from, to, and date query parameters are required',
        },
      })
    }

    const result = await tripService.search({
      fromCityId: parseInt(fromCityId, 10),
      toCityId: parseInt(toCityId, 10),
      date,
      seatCount,
      page,
      perPage,
    })

    return response.ok({ success: true, data: result.data, meta: result.meta })
  }

  /**
   * GET /api/v1/trips/:id
   * Trip details with stops and optional seat map.
   */
  async show(ctx: HttpContext) {
    const { params, request, response } = ctx

    const trip = await Trip.query()
      .where('id', params.id)
      .preload('vehicle')
      .preload('driver')
      .preload('route', (q) => q.preload('fromCity').preload('toCity'))
      .preload('seatLayout')
      .firstOrFail()

    const tripStops = await TripStop.query()
      .where('trip_id', trip.id)
      .preload('city')
      .orderBy('stop_order', 'asc')

    const boardingStopOrder = request.input('boarding_stop')
    const alightingStopOrder = request.input('alighting_stop')

    let seatMap = null
    if (boardingStopOrder !== null && alightingStopOrder !== null) {
      seatMap = await availabilityService.getSeatMap(
        trip.id,
        parseInt(boardingStopOrder, 10),
        parseInt(alightingStopOrder, 10)
      )
    }

    return response.ok({
      success: true,
      data: {
        ...trip.toJSON(),
        stops: tripStops,
        seatMap,
      },
    })
  }

  /**
   * PUT /api/v1/trips/:id
   * Update trip fields.
   */
  async update(ctx: HttpContext) {
    const { params, request, response } = ctx

    const trip = await Trip.findOrFail(params.id)
    const data = await request.validateUsing(updateTripValidator)

    if (data.vehicleId !== undefined) trip.vehicleId = data.vehicleId
    if (data.driverUserId !== undefined) trip.driverUserId = data.driverUserId
    if (data.notes !== undefined) trip.notes = data.notes
    if (data.allowIntermediateBoarding !== undefined) trip.allowIntermediateBoarding = data.allowIntermediateBoarding
    if (data.isRecurring !== undefined) trip.isRecurring = data.isRecurring
    if (data.recurrenceRule !== undefined) trip.recurrenceRule = data.recurrenceRule

    if (data.departureAt) {
      const dt = DateTime.fromISO(data.departureAt, { zone: 'utc' })
      if (!dt.isValid) {
        return response.badRequest({
          success: false,
          error: { code: 'E_VALIDATION', message: 'Invalid departure_at datetime format' },
        })
      }
      trip.departureAt = dt
    }

    if (data.estimatedArrivalAt) {
      const dt = DateTime.fromISO(data.estimatedArrivalAt, { zone: 'utc' })
      if (!dt.isValid) {
        return response.badRequest({
          success: false,
          error: { code: 'E_VALIDATION', message: 'Invalid estimated_arrival_at datetime format' },
        })
      }
      trip.estimatedArrivalAt = dt
    }

    await trip.save()

    return response.ok({ success: true, data: trip })
  }

  /**
   * DELETE /api/v1/trips/:id
   * Cancel a trip.
   */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx

    const trip = await Trip.findOrFail(params.id)

    if (trip.status === 'in_progress' || trip.status === 'completed') {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_INVALID_STATUS',
          message: 'Cannot cancel a trip that is in progress or completed',
        },
      })
    }

    await tripService.updateStatus(trip.id, 'cancelled')

    return response.ok({ success: true, data: { message: 'Trip cancelled' } })
  }

  /**
   * GET /api/v1/trips/:id/seats
   * Seat map for a specific segment.
   * Requires ?boarding_stop_order=N&alighting_stop_order=M
   */
  async seats(ctx: HttpContext) {
    const { params, request, response } = ctx

    const boardingStopOrder = request.input('boarding_stop_order')
    const alightingStopOrder = request.input('alighting_stop_order')

    if (boardingStopOrder === null || boardingStopOrder === undefined || alightingStopOrder === null || alightingStopOrder === undefined) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'boarding_stop_order and alighting_stop_order query params are required',
        },
      })
    }

    await Trip.findOrFail(params.id) // ensure trip exists

    const seatMap = await availabilityService.getSeatMap(
      parseInt(params.id, 10),
      parseInt(boardingStopOrder, 10),
      parseInt(alightingStopOrder, 10)
    )

    return response.ok({ success: true, data: seatMap })
  }

  /**
   * GET /api/v1/trips/:id/stops
   * All stops for a trip with schedule.
   */
  async stops(ctx: HttpContext) {
    const { params, response } = ctx

    await Trip.findOrFail(params.id)

    const tripStops = await TripStop.query()
      .where('trip_id', params.id)
      .preload('city')
      .orderBy('stop_order', 'asc')

    return response.ok({ success: true, data: tripStops })
  }

  /**
   * PUT /api/v1/trips/:id/stops/:stopId
   * Update stop times or boarding/alighting flags.
   */
  async updateStop(ctx: HttpContext) {
    const { params, request, response } = ctx

    const stop = await TripStop.findOrFail(params.stopId)

    if (stop.tripId !== parseInt(params.id, 10)) {
      return response.badRequest({
        success: false,
        error: { code: 'E_INVALID_STOP', message: 'Stop does not belong to this trip' },
      })
    }

    const data = await request.validateUsing(updateTripStopValidator)

    if (data.stopName !== undefined) stop.stopName = data.stopName

    if (data.scheduledArrivalAt) {
      const dt = DateTime.fromISO(data.scheduledArrivalAt, { zone: 'utc' })
      if (dt.isValid) stop.scheduledArrivalAt = dt
    }

    if (data.scheduledDepartureAt) {
      const dt = DateTime.fromISO(data.scheduledDepartureAt, { zone: 'utc' })
      if (dt.isValid) stop.scheduledDepartureAt = dt
    }

    if (data.actualArrivalAt) {
      const dt = DateTime.fromISO(data.actualArrivalAt, { zone: 'utc' })
      if (dt.isValid) stop.actualArrivalAt = dt
    }

    if (data.actualDepartureAt) {
      const dt = DateTime.fromISO(data.actualDepartureAt, { zone: 'utc' })
      if (dt.isValid) stop.actualDepartureAt = dt
    }

    if (data.boardingEnabled !== undefined) stop.boardingEnabled = data.boardingEnabled
    if (data.alightingEnabled !== undefined) stop.alightingEnabled = data.alightingEnabled

    await stop.save()

    return response.ok({ success: true, data: stop })
  }

  /**
   * POST /api/v1/trips/:id/start
   * Mark trip as in_progress (bus departed from first stop).
   */
  async start(ctx: HttpContext) {
    const { params, response } = ctx

    const trip = await Trip.findOrFail(params.id)

    if (trip.status !== 'boarding' && trip.status !== 'scheduled') {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_INVALID_STATUS',
          message: `Trip cannot be started from status: ${trip.status}`,
        },
      })
    }

    const updated = await tripService.updateStatus(trip.id, 'in_progress')

    return response.ok({ success: true, data: updated })
  }

  /**
   * POST /api/v1/trips/:id/stops/:stopId/arrive
   * Mark actual arrival at an intermediate stop.
   */
  async arriveAtStop(ctx: HttpContext) {
    const { params, response } = ctx

    const stop = await tripService.arriveAtStop(
      parseInt(params.id, 10),
      parseInt(params.stopId, 10)
    )

    return response.ok({ success: true, data: stop })
  }

  /**
   * POST /api/v1/trips/:id/stops/:stopId/depart
   * Mark actual departure from an intermediate stop.
   */
  async departFromStop(ctx: HttpContext) {
    const { params, response } = ctx

    const stop = await tripService.departFromStop(
      parseInt(params.id, 10),
      parseInt(params.stopId, 10)
    )

    return response.ok({ success: true, data: stop })
  }

  /**
   * POST /api/v1/trips/:id/complete
   * Mark trip as completed.
   */
  async complete(ctx: HttpContext) {
    const { params, response } = ctx

    const trip = await Trip.findOrFail(params.id)

    if (trip.status !== 'in_progress') {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_INVALID_STATUS',
          message: `Trip cannot be completed from status: ${trip.status}`,
        },
      })
    }

    const updated = await tripService.updateStatus(trip.id, 'completed')

    return response.ok({ success: true, data: updated })
  }

  /**
   * GET /api/v1/trips/:id/manifest
   * Per-stop passenger manifest — who boards and alights at a specific stop.
   * Requires ?stop_id=N
   */
  async manifest(ctx: HttpContext) {
    const { params, request, response } = ctx

    const stopId = request.input('stop_id')

    if (!stopId) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'stop_id query param is required' },
      })
    }

    const manifest = await tripService.getStopPassengerManifest(
      parseInt(params.id, 10),
      parseInt(stopId, 10)
    )

    return response.ok({ success: true, data: manifest })
  }
}
