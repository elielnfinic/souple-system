import type { HttpContext } from '@adonisjs/core/http'
import MaintenanceRecord from '#models/maintenance_record'

export default class MaintenanceRecordsController {
  /**
   * GET /api/v1/vehicles/:vehicleId/maintenance
   */
  async index({ params, response }: HttpContext) {
    const records = await MaintenanceRecord.query()
      .where('vehicle_id', params.vehicleId)
      .orderBy('performed_at', 'desc')

    return response.ok({ success: true, data: records })
  }

  /**
   * POST /api/v1/vehicles/:vehicleId/maintenance
   */
  async store({ params, request, response }: HttpContext) {
    const body = request.body() as Record<string, any>

    const record = await MaintenanceRecord.create({
      vehicleId: Number(params.vehicleId),
      type: body.type,
      performedBy: body.performedBy ?? null,
      performedAt: body.performedAt,
      odometerKm: body.odometerKm ?? null,
      costCdf: body.costCdf ?? null,
      description: body.description,
      nextServiceKm: body.nextServiceKm ?? null,
      nextServiceDate: body.nextServiceDate ?? null,
    })

    return response.created({ success: true, data: record })
  }

  /**
   * PUT /api/v1/vehicles/:vehicleId/maintenance/:id
   */
  async update({ params, request, response }: HttpContext) {
    const record = await MaintenanceRecord.query()
      .where('id', params.id)
      .where('vehicle_id', params.vehicleId)
      .firstOrFail()

    const body = request.body() as Record<string, any>
    record.merge(body)
    await record.save()

    return response.ok({ success: true, data: record })
  }
}
