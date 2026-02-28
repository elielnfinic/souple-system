import type { HttpContext } from '@adonisjs/core/http'
import { VehicleService } from '#services/vehicle_service'
import {
  createVehicleValidator,
  updateVehicleValidator,
  verifyVehicleValidator,
} from '#validators/vehicle_validator'

const vehicleService = new VehicleService()

export default class VehiclesController {
  /**
   * GET /api/v1/vehicles
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const orgId = request.input('org_id')
    const ownerId = request.input('owner_id')
    const visibility = request.input('visibility')
    const verificationStatus = request.input('verification_status')
    const type = request.input('type')

    const paginated = await vehicleService.list({
      page,
      limit,
      orgId: orgId ? Number(orgId) : undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
      visibility,
      verificationStatus,
      type,
    })

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
   * GET /api/v1/vehicles/:id
   */
  async show({ params, response }: HttpContext) {
    const vehicle = await vehicleService.findOrFail(Number(params.id))
    return response.ok({ success: true, data: vehicle })
  }

  /**
   * POST /api/v1/vehicles
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(createVehicleValidator)
    const orgId = request.input('organization_id')

    const vehicle = await vehicleService.create(
      data,
      user.id,
      orgId ? Number(orgId) : undefined
    )

    return response.created({ success: true, data: vehicle })
  }

  /**
   * PUT /api/v1/vehicles/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const vehicle = await vehicleService.findOrFail(Number(params.id))

    if (!user.isSuperAdmin && vehicle.ownerUserId !== user.id) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'You do not own this vehicle' },
      })
    }

    const data = await request.validateUsing(updateVehicleValidator)
    const updated = await vehicleService.update(Number(params.id), data)

    return response.ok({ success: true, data: updated })
  }

  /**
   * DELETE /api/v1/vehicles/:id
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const vehicle = await vehicleService.findOrFail(Number(params.id))

    if (!user.isSuperAdmin && vehicle.ownerUserId !== user.id) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'You do not own this vehicle' },
      })
    }

    await vehicleService.softDelete(Number(params.id))
    return response.ok({ success: true, data: { message: 'Vehicle deactivated' } })
  }

  /**
   * PUT /api/v1/vehicles/:id/verify
   */
  async verify({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const { status, notes } = await request.validateUsing(verifyVehicleValidator)
    const vehicle = await vehicleService.verify(Number(params.id), status, notes)

    return response.ok({ success: true, data: vehicle })
  }
}
