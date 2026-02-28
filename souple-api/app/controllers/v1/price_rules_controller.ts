import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import PriceRule from '#models/price_rule'
import { PriceService } from '#services/price_service'
import { priceRuleValidator, updatePriceRuleValidator } from '#validators/trip_validator'

const priceService = new PriceService()

export default class PriceRulesController {
  /**
   * GET /api/v1/price-rules
   * List price rules, org-scoped or global.
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 50), 200)
    const routeId = request.input('route_id')
    const isActive = request.input('is_active')

    const query = PriceRule.query()
      .preload('route')
      .orderBy('route_id', 'asc')
      .orderBy('from_stop_order', 'asc')

    if (ctx.organization) {
      query.where((q) => {
        q.where('organization_id', ctx.organization!.id).orWhereNull('organization_id')
      })
    }

    if (routeId) query.where('route_id', routeId)
    if (isActive !== undefined && isActive !== '') query.where('is_active', isActive === 'true')

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
   * POST /api/v1/price-rules
   * Create a price rule.
   */
  async store(ctx: HttpContext) {
    const { request, response } = ctx

    const data = await request.validateUsing(priceRuleValidator)

    const rule = await PriceRule.create({
      organizationId: ctx.organization?.id ?? null,
      routeId: data.routeId,
      fromStopOrder: data.fromStopOrder ?? null,
      toStopOrder: data.toStopOrder ?? null,
      seatClassId: data.seatClassId ?? null,
      vehicleId: data.vehicleId ?? null,
      basePrice: data.basePrice,
      currency: data.currency ?? 'CDF',
      priceMode: data.priceMode ?? 'fixed',
      perSegmentPrice: data.perSegmentPrice ?? null,
      perKmPrice: data.perKmPrice ?? null,
      effectiveFrom: DateTime.fromJSDate(data.effectiveFrom as unknown as Date),
      effectiveUntil: data.effectiveUntil
        ? DateTime.fromJSDate(data.effectiveUntil as unknown as Date)
        : null,
      isPeak: data.isPeak ?? false,
      peakMultiplier: data.peakMultiplier ?? 1.0,
      isActive: data.isActive ?? true,
    })

    return response.created({ success: true, data: rule })
  }

  /**
   * PUT /api/v1/price-rules/:id
   * Update a price rule.
   */
  async update(ctx: HttpContext) {
    const { params, request, response } = ctx

    const rule = await PriceRule.findOrFail(params.id)
    const data = await request.validateUsing(updatePriceRuleValidator)

    if (data.fromStopOrder !== undefined) rule.fromStopOrder = data.fromStopOrder
    if (data.toStopOrder !== undefined) rule.toStopOrder = data.toStopOrder
    if (data.seatClassId !== undefined) rule.seatClassId = data.seatClassId
    if (data.vehicleId !== undefined) rule.vehicleId = data.vehicleId
    if (data.basePrice !== undefined) rule.basePrice = data.basePrice
    if (data.currency !== undefined) rule.currency = data.currency
    if (data.priceMode !== undefined) rule.priceMode = data.priceMode
    if (data.perSegmentPrice !== undefined) rule.perSegmentPrice = data.perSegmentPrice
    if (data.perKmPrice !== undefined) rule.perKmPrice = data.perKmPrice
    if (data.isPeak !== undefined) rule.isPeak = data.isPeak
    if (data.peakMultiplier !== undefined) rule.peakMultiplier = data.peakMultiplier
    if (data.isActive !== undefined) rule.isActive = data.isActive

    if (data.effectiveFrom) {
      rule.effectiveFrom = DateTime.fromJSDate(data.effectiveFrom as unknown as Date)
    }

    if (data.effectiveUntil !== undefined) {
      rule.effectiveUntil = data.effectiveUntil
        ? DateTime.fromJSDate(data.effectiveUntil as unknown as Date)
        : null
    }

    await rule.save()

    return response.ok({ success: true, data: rule })
  }

  /**
   * DELETE /api/v1/price-rules/:id
   * Soft-delete a price rule by marking it inactive.
   */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx

    const rule = await PriceRule.findOrFail(params.id)
    rule.isActive = false
    await rule.save()

    return response.ok({ success: true, data: { message: 'Price rule deactivated' } })
  }

  /**
   * GET /api/v1/price-rules/calculate
   * Preview the price for a given segment + class + date.
   * Query params: trip_id, route_id, boarding_stop_order, alighting_stop_order, seat_class, date
   */
  async calculate(ctx: HttpContext) {
    const { request, response } = ctx

    const tripId = parseInt(request.input('trip_id', '0'), 10)
    const routeId = parseInt(request.input('route_id', '0'), 10)
    const boardingStopOrder = parseInt(request.input('boarding_stop_order', '0'), 10)
    const alightingStopOrder = parseInt(request.input('alighting_stop_order', '1'), 10)
    const seatClass = request.input('seat_class', 'economy')
    const dateStr = request.input('date', DateTime.utc().toISODate())

    if (!tripId || !routeId) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'trip_id and route_id are required' },
      })
    }

    const date = DateTime.fromISO(dateStr, { zone: 'utc' })

    const priceResult = await priceService.calculateSegmentPrice({
      tripId,
      routeId,
      boardingStopOrder,
      alightingStopOrder,
      seatClass,
      date,
      orgId: ctx.organization?.id,
    })

    return response.ok({ success: true, data: priceResult })
  }

  /**
   * GET /api/v1/price-rules/matrix/:routeId
   * Price matrix for all stop-pair combinations on a trip.
   * Query param: trip_id, seat_class (default: 'economy')
   */
  async matrix(ctx: HttpContext) {
    const { params, request, response } = ctx

    const tripId = parseInt(request.input('trip_id', '0'), 10)
    const seatClass = request.input('seat_class', 'economy')

    if (!tripId) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'trip_id query param is required' },
      })
    }

    const matrix = await priceService.getPriceMatrix(tripId, seatClass)

    return response.ok({ success: true, data: matrix })
  }
}
