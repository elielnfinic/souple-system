import type { HttpContext } from '@adonisjs/core/http'
import Route from '#models/route'
import RouteStop from '#models/route_stop'
import {
  createRouteValidator,
  updateRouteValidator,
  addStopValidator,
  updateStopValidator,
} from '#validators/city_route_validator'

export default class RoutesController {
  /**
   * GET /api/v1/routes — public
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 50), 200)
    const fromCityId = request.input('from_city_id')
    const toCityId = request.input('to_city_id')

    const query = Route.query()
      .where('is_active', true)
      .preload('fromCity')
      .preload('toCity')

    if (fromCityId) query.where('from_city_id', fromCityId)
    if (toCityId) query.where('to_city_id', toCityId)

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
   * GET /api/v1/routes/:id — with stops
   */
  async show({ params, response }: HttpContext) {
    const route = await Route.query()
      .where('id', params.id)
      .preload('fromCity')
      .preload('toCity')
      .preload('stops', (q) => q.orderBy('stop_order', 'asc').preload('city'))
      .firstOrFail()

    return response.ok({ success: true, data: route })
  }

  /**
   * POST /api/v1/routes — authenticated (super admin or org member)
   */
  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    if (!user.isSuperAdmin && !ctx.membership) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Organization context required' },
      })
    }

    const data = await request.validateUsing(createRouteValidator)

    if (data.fromCityId === data.toCityId) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Origin and destination must be different' },
      })
    }

    const existing = await Route.query()
      .where('from_city_id', data.fromCityId)
      .where('to_city_id', data.toCityId)
      .first()

    if (existing) {
      return response.conflict({
        success: false,
        error: { code: 'E_CONFLICT', message: 'This route already exists' },
      })
    }

    const route = await Route.create({
      fromCityId: data.fromCityId,
      toCityId: data.toCityId,
      distanceKm: data.distanceKm ?? null,
      estimatedDurationMin: data.estimatedDurationMin ?? null,
      isActive: true,
    })

    await route.load('fromCity')
    await route.load('toCity')

    return response.created({ success: true, data: route })
  }

  /**
   * PUT /api/v1/routes/:id
   */
  async update(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.user!

    if (!user.isSuperAdmin && !ctx.membership) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Organization context required' },
      })
    }

    const route = await Route.findOrFail(params.id)
    const data = await request.validateUsing(updateRouteValidator)
    route.merge(data)
    await route.save()

    return response.ok({ success: true, data: route })
  }

  /**
   * DELETE /api/v1/routes/:id — soft delete, super admin only
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const route = await Route.findOrFail(params.id)
    route.isActive = false
    await route.save()

    return response.ok({ success: true, data: { message: 'Route deactivated' } })
  }

  // ─── Stops ────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/routes/:id/stops
   */
  async addStop(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.user!

    if (!user.isSuperAdmin && !ctx.membership) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Organization context required' },
      })
    }

    const route = await Route.findOrFail(params.id)
    const data = await request.validateUsing(addStopValidator)

    const stop = await RouteStop.create({
      routeId: route.id,
      cityId: data.cityId,
      stopOrder: data.stopOrder,
      distanceFromStartKm: data.distanceFromStartKm ?? null,
    })

    await stop.load('city')
    return response.created({ success: true, data: stop })
  }

  /**
   * PUT /api/v1/routes/:id/stops/:stopId
   */
  async updateStop(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.user!

    if (!user.isSuperAdmin && !ctx.membership) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Organization context required' },
      })
    }

    const stop = await RouteStop.query()
      .where('id', params.stopId)
      .where('route_id', params.id)
      .firstOrFail()

    const data = await request.validateUsing(updateStopValidator)
    stop.merge(data)
    await stop.save()

    return response.ok({ success: true, data: stop })
  }

  /**
   * DELETE /api/v1/routes/:id/stops/:stopId
   */
  async removeStop(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.user!

    if (!user.isSuperAdmin && !ctx.membership) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Organization context required' },
      })
    }

    const stop = await RouteStop.query()
      .where('id', params.stopId)
      .where('route_id', params.id)
      .firstOrFail()

    await stop.delete()
    return response.ok({ success: true, data: { message: 'Stop removed' } })
  }
}
