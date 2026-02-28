import type { HttpContext } from '@adonisjs/core/http'
import { SeatLayoutService } from '#services/seat_layout_service'
import {
  createSeatLayoutValidator,
  updateSeatLayoutValidator,
} from '#validators/seat_layout_validator'

const seatLayoutService = new SeatLayoutService()

export default class SeatLayoutsController {
  /**
   * GET /api/v1/vehicles/:vehicleId/seat-layouts
   */
  async index({ params, response }: HttpContext) {
    const layouts = await seatLayoutService.listByVehicle(Number(params.vehicleId))
    return response.ok({ success: true, data: layouts })
  }

  /**
   * GET /api/v1/vehicles/:vehicleId/seat-layouts/:id
   */
  async show({ params, response }: HttpContext) {
    const layout = await seatLayoutService.findOrFail(
      Number(params.vehicleId),
      Number(params.id)
    )
    return response.ok({ success: true, data: layout })
  }

  /**
   * POST /api/v1/vehicles/:vehicleId/seat-layouts
   */
  async store({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(createSeatLayoutValidator)
    const layout = await seatLayoutService.create(Number(params.vehicleId), data)
    return response.created({ success: true, data: layout })
  }

  /**
   * PUT /api/v1/vehicles/:vehicleId/seat-layouts/:id
   */
  async update({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateSeatLayoutValidator)
    const layout = await seatLayoutService.update(Number(params.id), data)
    return response.ok({ success: true, data: layout })
  }

  /**
   * DELETE /api/v1/vehicles/:vehicleId/seat-layouts/:id
   */
  async destroy({ params, response }: HttpContext) {
    await seatLayoutService.delete(Number(params.id))
    return response.ok({ success: true, data: { message: 'Seat layout deleted' } })
  }

  /**
   * PUT /api/v1/vehicles/:vehicleId/seat-layouts/:id/default
   */
  async setDefault({ params, response }: HttpContext) {
    await seatLayoutService.setDefault(Number(params.vehicleId), Number(params.id))
    return response.ok({ success: true, data: { message: 'Default layout updated' } })
  }
}
