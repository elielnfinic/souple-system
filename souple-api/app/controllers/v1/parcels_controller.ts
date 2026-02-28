import type { HttpContext } from '@adonisjs/core/http'
import Parcel from '#models/parcel'
import { generateReference } from '#utils/generate_reference'

export default class ParcelsController {
  /**
   * GET /api/v1/parcels
   */
  async index({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const query = Parcel.query().orderBy('created_at', 'desc')

    if (request.input('organization_id')) {
      query.where('organization_id', request.input('organization_id'))
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
   * POST /api/v1/parcels
   */
  async store({ request, response }: HttpContext) {
    const body = request.body() as Record<string, any>

    const parcel = await Parcel.create({
      ...body,
      trackingCode: generateReference('PARC'),
      status: 'pending',
    })

    return response.created({ success: true, data: parcel })
  }

  /**
   * GET /api/v1/parcels/:id
   */
  async show({ params, response }: HttpContext) {
    const parcel = await Parcel.query()
      .where('id', params.id)
      .preload('originCity')
      .preload('destinationCity')
      .firstOrFail()

    return response.ok({ success: true, data: parcel })
  }

  /**
   * PUT /api/v1/parcels/:id
   */
  async update({ params, request, response }: HttpContext) {
    const parcel = await Parcel.findOrFail(params.id)
    const body = request.body() as Record<string, any>

    parcel.merge(body)
    await parcel.save()

    return response.ok({ success: true, data: parcel })
  }

  /**
   * GET /api/v1/parcels/track/:code (public)
   */
  async trackByCode({ params, response }: HttpContext) {
    const parcel = await Parcel.query()
      .where('tracking_code', params.code)
      .preload('originCity')
      .preload('destinationCity')
      .firstOrFail()

    return response.ok({
      success: true,
      data: {
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        senderName: parcel.senderName,
        receiverName: parcel.receiverName,
        originCity: parcel.originCity,
        destinationCity: parcel.destinationCity,
        pickupAt: parcel.pickupAt,
        deliveredAt: parcel.deliveredAt,
      },
    })
  }
}
