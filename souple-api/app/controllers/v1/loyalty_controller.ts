import type { HttpContext } from '@adonisjs/core/http'
import LoyaltyPoint from '#models/loyalty_point'
import type User from '#models/user'

export default class LoyaltyController {
  /**
   * GET /api/v1/loyalty/balance
   */
  async balance({ auth, response }: HttpContext) {
    const user = auth.user! as User

    const lastEntry = await LoyaltyPoint.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .first()

    const balance = lastEntry?.balanceAfter ?? 0

    return response.ok({ success: true, data: { balance } })
  }

  /**
   * GET /api/v1/loyalty/history
   */
  async history({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const paginated = await LoyaltyPoint.query()
      .where('user_id', user.id)
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
}
