import type { HttpContext } from '@adonisjs/core/http'
import SeatClass from '#models/seat_class'
import vine from '@vinejs/vine'

const createSeatClassValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(50),
    slug: vine.string().trim().maxLength(50),
    description: vine.string().trim().optional(),
    defaultMultiplier: vine.number().min(0).optional(),
    color: vine.string().trim().maxLength(7).optional(),
    icon: vine.string().trim().maxLength(50).optional(),
  })
)

const updateSeatClassValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(50).optional(),
    slug: vine.string().trim().maxLength(50).optional(),
    description: vine.string().trim().optional(),
    defaultMultiplier: vine.number().min(0).optional(),
    color: vine.string().trim().maxLength(7).optional(),
    icon: vine.string().trim().maxLength(50).optional(),
  })
)

export default class SeatClassesController {
  /**
   * GET /api/v1/seat-classes
   */
  async index({ response }: HttpContext) {
    const classes = await SeatClass.query().orderBy('name', 'asc')
    return response.ok({ success: true, data: classes })
  }

  /**
   * GET /api/v1/seat-classes/:id
   */
  async show({ params, response }: HttpContext) {
    const seatClass = await SeatClass.findOrFail(params.id)
    return response.ok({ success: true, data: seatClass })
  }

  /**
   * POST /api/v1/seat-classes
   */
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createSeatClassValidator)
    const seatClass = await SeatClass.create(data)
    return response.created({ success: true, data: seatClass })
  }

  /**
   * PUT /api/v1/seat-classes/:id
   */
  async update({ params, request, response }: HttpContext) {
    const seatClass = await SeatClass.findOrFail(params.id)
    const data = await request.validateUsing(updateSeatClassValidator)
    seatClass.merge(data)
    await seatClass.save()
    return response.ok({ success: true, data: seatClass })
  }

  /**
   * DELETE /api/v1/seat-classes/:id
   */
  async destroy({ params, response }: HttpContext) {
    const seatClass = await SeatClass.findOrFail(params.id)
    await seatClass.delete()
    return response.ok({ success: true, data: { message: 'Seat class deleted' } })
  }
}
