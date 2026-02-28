import type { HttpContext } from '@adonisjs/core/http'
import SeatClass from '#models/seat_class'
import {
  createSeatClassValidator,
  updateSeatClassValidator,
} from '#validators/vehicle_validator'

export default class SeatClassesController {
  /**
   * GET /api/v1/seat-classes — public
   */
  async index({ response }: HttpContext) {
    const classes = await SeatClass.query().orderBy('default_multiplier', 'asc')
    return response.ok({ success: true, data: classes })
  }

  /**
   * POST /api/v1/seat-classes — super_admin only
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const data = await request.validateUsing(createSeatClassValidator)

    // Ensure slug is unique
    const existing = await SeatClass.findBy('slug', data.slug)
    if (existing) {
      return response.conflict({
        success: false,
        error: { code: 'E_CONFLICT', message: `A seat class with slug "${data.slug}" already exists` },
      })
    }

    const seatClass = await SeatClass.create({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      defaultMultiplier: data.defaultMultiplier ?? 1.0,
      color: data.color ?? null,
      icon: data.icon ?? null,
    })

    return response.created({ success: true, data: seatClass })
  }

  /**
   * PUT /api/v1/seat-classes/:id — super_admin only
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const seatClass = await SeatClass.findOrFail(params.id)
    const data = await request.validateUsing(updateSeatClassValidator)

    seatClass.merge({
      name: data.name ?? seatClass.name,
      description: data.description !== undefined ? (data.description ?? null) : seatClass.description,
      defaultMultiplier: data.defaultMultiplier ?? seatClass.defaultMultiplier,
      color: data.color !== undefined ? (data.color ?? null) : seatClass.color,
      icon: data.icon !== undefined ? (data.icon ?? null) : seatClass.icon,
    })

    await seatClass.save()

    return response.ok({ success: true, data: seatClass })
  }

  /**
   * DELETE /api/v1/seat-classes/:id — super_admin only
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!

    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const seatClass = await SeatClass.findOrFail(params.id)
    await seatClass.delete()

    return response.ok({ success: true, data: { message: 'Seat class deleted' } })
  }
}
