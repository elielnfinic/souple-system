import type { HttpContext } from '@adonisjs/core/http'
import Promotion from '#models/promotion'

export default class PromotionsController {
  /**
   * GET /api/v1/promotions
   */
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const query = Promotion.query().orderBy('created_at', 'desc')

    if (request.input('organization_id')) {
      query.where('organization_id', request.input('organization_id'))
    }
    if (request.input('active_only')) {
      query.where('is_active', true)
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
   * POST /api/v1/promotions
   */
  async store({ request, response }: HttpContext) {
    const body = request.body() as Record<string, any>

    const promotion = await Promotion.create({
      ...body,
      currentUses: 0,
      isActive: body.is_active ?? true,
    })

    return response.created({ success: true, data: promotion })
  }

  /**
   * PUT /api/v1/promotions/:id
   */
  async update({ params, request, response }: HttpContext) {
    const promotion = await Promotion.findOrFail(params.id)
    const body = request.body() as Record<string, any>

    promotion.merge(body)
    await promotion.save()

    return response.ok({ success: true, data: promotion })
  }

  /**
   * DELETE /api/v1/promotions/:id
   */
  async destroy({ params, response }: HttpContext) {
    const promotion = await Promotion.findOrFail(params.id)
    promotion.isActive = false
    await promotion.save()

    return response.ok({ success: true, data: { message: 'Promotion deactivated' } })
  }
}
