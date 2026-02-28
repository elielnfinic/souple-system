import type { HttpContext } from '@adonisjs/core/http'
import Review from '#models/review'
import type User from '#models/user'

export default class ReviewsController {
  /**
   * GET /api/v1/reviews (public)
   */
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const query = Review.query().where('is_public', true).orderBy('created_at', 'desc')

    if (request.input('organization_id')) {
      query.where('organization_id', request.input('organization_id'))
    }
    if (request.input('vehicle_id')) {
      query.where('vehicle_id', request.input('vehicle_id'))
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
   * POST /api/v1/reviews
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const review = await Review.create({
      ...body,
      reviewerUserId: user.id,
    })

    return response.created({ success: true, data: review })
  }

  /**
   * GET /api/v1/reviews/:id (public)
   */
  async show({ params, response }: HttpContext) {
    const review = await Review.findOrFail(params.id)
    return response.ok({ success: true, data: review })
  }
}
