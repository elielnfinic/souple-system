import type { HttpContext } from '@adonisjs/core/http'
import VehicleDocument from '#models/vehicle_document'

export default class VehicleDocumentsController {
  /**
   * GET /api/v1/vehicles/:vehicleId/documents
   */
  async index({ params, response }: HttpContext) {
    const documents = await VehicleDocument.query()
      .where('vehicle_id', params.vehicleId)
      .orderBy('expiry_date', 'asc')

    return response.ok({ success: true, data: documents })
  }

  /**
   * POST /api/v1/vehicles/:vehicleId/documents
   */
  async store({ params, request, response }: HttpContext) {
    const body = request.body() as Record<string, any>

    const document = await VehicleDocument.create({
      vehicleId: Number(params.vehicleId),
      type: body.type,
      documentNumber: body.documentNumber ?? null,
      fileUrl: body.fileUrl,
      fileKey: body.fileKey ?? null,
      issuedDate: body.issuedDate ?? null,
      expiryDate: body.expiryDate ?? null,
      status: body.status ?? 'valid',
      notes: body.notes ?? null,
    })

    return response.created({ success: true, data: document })
  }

  /**
   * PUT /api/v1/vehicles/:vehicleId/documents/:id
   */
  async update({ params, request, response }: HttpContext) {
    const document = await VehicleDocument.query()
      .where('id', params.id)
      .where('vehicle_id', params.vehicleId)
      .firstOrFail()

    const body = request.body() as Record<string, any>
    document.merge(body)
    await document.save()

    return response.ok({ success: true, data: document })
  }

  /**
   * DELETE /api/v1/vehicles/:vehicleId/documents/:id
   */
  async destroy({ params, response }: HttpContext) {
    const document = await VehicleDocument.query()
      .where('id', params.id)
      .where('vehicle_id', params.vehicleId)
      .firstOrFail()

    await document.delete()
    return response.ok({ success: true, message: 'Document deleted' })
  }
}
