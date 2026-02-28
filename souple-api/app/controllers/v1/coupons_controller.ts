import type { HttpContext } from '@adonisjs/core/http'
import Coupon from '#models/coupon'
import { DateTime } from 'luxon'

export default class CouponsController {
  /**
   * POST /api/v1/coupons/validate (public)
   */
  async validate({ request, response }: HttpContext) {
    const { code, amount } = request.body() as { code: string; amount?: number }

    const coupon = await Coupon.query()
      .where('code', code)
      .where('is_active', true)
      .preload('promotion')
      .first()

    if (!coupon) {
      return response.unprocessableEntity({ success: false, message: 'Invalid coupon code' })
    }

    if (coupon.expiresAt && coupon.expiresAt < DateTime.now()) {
      return response.unprocessableEntity({ success: false, message: 'Coupon has expired' })
    }

    if (coupon.usageLimit !== null && coupon.currentUses >= coupon.usageLimit) {
      return response.unprocessableEntity({ success: false, message: 'Coupon usage limit reached' })
    }

    if (coupon.promotion && coupon.promotion.minAmountCdf && amount && amount < coupon.promotion.minAmountCdf) {
      return response.unprocessableEntity({
        success: false,
        message: `Minimum amount of ${coupon.promotion.minAmountCdf} CDF required`,
      })
    }

    return response.ok({ success: true, data: { coupon, promotion: coupon.promotion } })
  }

  /**
   * GET /api/v1/coupons
   */
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const query = Coupon.query().orderBy('created_at', 'desc')

    if (request.input('organization_id')) {
      query.where('organization_id', request.input('organization_id'))
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
   * POST /api/v1/coupons
   */
  async store({ request, response }: HttpContext) {
    const body = request.body() as Record<string, any>

    const coupon = await Coupon.create({
      ...body,
      currentUses: 0,
      isActive: body.is_active ?? true,
    })

    return response.created({ success: true, data: coupon })
  }
}
