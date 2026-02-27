import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class UsersController {
  /**
   * GET /api/v1/users
   * Super admin: list all users. Others: 403.
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const search = request.input('search', '')
    const isActive = request.input('is_active')

    const query = User.query()

    if (search) {
      query.where((q) => {
        q.where('phone', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`)
          .orWhere('first_name', 'like', `%${search}%`)
          .orWhere('last_name', 'like', `%${search}%`)
      })
    }

    if (isActive !== undefined) {
      query.where('is_active', isActive === 'true' || isActive === '1')
    }

    const paginated = await query
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

    const json = paginated.toJSON()

    return response.ok({
      success: true,
      data: json.data.map((u) => u.serialize()),
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    })
  }

  /**
   * GET /api/v1/users/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const viewer = auth.user!
    if (!viewer.isSuperAdmin && viewer.id !== Number(params.id)) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Access denied' },
      })
    }

    const user = await User.findOrFail(params.id)
    return response.ok({ success: true, data: user.serialize() })
  }

  /**
   * PUT /api/v1/users/:id
   * Super admin can update any user. Users can update themselves (limited fields).
   */
  async update({ auth, params, request, response }: HttpContext) {
    const viewer = auth.user!
    const user = await User.findOrFail(params.id)

    if (viewer.isSuperAdmin) {
      const data = request.only([
        'firstName', 'lastName', 'email', 'locale',
        'timezone', 'isActive', 'isSuperAdmin',
      ])
      user.merge(data)
    } else if (viewer.id === user.id) {
      const data = request.only(['firstName', 'lastName', 'locale', 'timezone', 'avatarUrl'])
      user.merge(data)
    } else {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Access denied' },
      })
    }

    await user.save()
    return response.ok({ success: true, data: user.serialize() })
  }

  /**
   * DELETE /api/v1/users/:id — soft delete (set is_active = false)
   */
  async destroy({ auth, params, response }: HttpContext) {
    const viewer = auth.user!
    if (!viewer.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const user = await User.findOrFail(params.id)
    if (user.id === viewer.id) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'You cannot deactivate your own account' },
      })
    }

    user.isActive = false
    await user.save()

    return response.ok({ success: true, data: { message: 'User deactivated' } })
  }
}
