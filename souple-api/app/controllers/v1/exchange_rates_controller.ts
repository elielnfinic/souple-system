import type { HttpContext } from '@adonisjs/core/http'
import ExchangeRate from '#models/exchange_rate'
import type User from '#models/user'
import { DateTime } from 'luxon'

export default class ExchangeRatesController {
  /**
   * GET /api/v1/exchange-rates (auth)
   */
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const paginated = await ExchangeRate.query()
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

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
   * GET /api/v1/exchange-rates/current (public)
   */
  async current({ request, response }: HttpContext) {
    const from = request.input('from', 'USD')
    const to = request.input('to', 'CDF')

    const rate = await ExchangeRate.query()
      .where('from_currency', from)
      .where('to_currency', to)
      .where('is_active', true)
      .orderBy('valid_from', 'desc')
      .firstOrFail()

    return response.ok({ success: true, data: rate })
  }

  /**
   * POST /api/v1/exchange-rates (auth)
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const rate = await ExchangeRate.create({
      ...body,
      createdByUserId: user.id,
      validFrom: body.valid_from ? DateTime.fromISO(body.valid_from) : DateTime.now(),
    })

    return response.created({ success: true, data: rate })
  }

  /**
   * PUT /api/v1/exchange-rates/:id (auth)
   */
  async update({ params, request, response }: HttpContext) {
    const rate = await ExchangeRate.findOrFail(params.id)
    const body = request.body() as Record<string, any>

    rate.merge(body)
    await rate.save()

    return response.ok({ success: true, data: rate })
  }
}
