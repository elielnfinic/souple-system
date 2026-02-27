import type { HttpContext } from '@adonisjs/core/http'
import City from '#models/city'
import {
  createCityValidator,
  updateCityValidator,
} from '#validators/city_route_validator'

export default class CitiesController {
  /**
   * GET /api/v1/cities — public, no auth required
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 50), 200)
    const search = request.input('search', '')
    const country = request.input('country', 'CD')

    const query = City.query().where('is_active', true)

    if (country) query.where('country', country)
    if (search) {
      query.where((q) => {
        q.where('name', 'like', `%${search}%`).orWhere('province', 'like', `%${search}%`)
      })
    }

    const paginated = await query.orderBy('name', 'asc').paginate(page, perPage)
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
   * GET /api/v1/cities/:id
   */
  async show({ params, response }: HttpContext) {
    const city = await City.findOrFail(params.id)
    return response.ok({ success: true, data: city })
  }

  /**
   * POST /api/v1/cities — super admin only
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const data = await request.validateUsing(createCityValidator)

    const city = await City.create({
      name: data.name,
      province: data.province,
      country: data.country ?? 'CD',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      timezone: data.timezone ?? 'Africa/Lubumbashi',
      isActive: true,
    })

    return response.created({ success: true, data: city })
  }

  /**
   * PUT /api/v1/cities/:id — super admin only
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const city = await City.findOrFail(params.id)
    const data = await request.validateUsing(updateCityValidator)
    city.merge(data)
    await city.save()

    return response.ok({ success: true, data: city })
  }

  /**
   * DELETE /api/v1/cities/:id — super admin only (soft delete)
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const city = await City.findOrFail(params.id)
    city.isActive = false
    await city.save()

    return response.ok({ success: true, data: { message: 'City deactivated' } })
  }
}
