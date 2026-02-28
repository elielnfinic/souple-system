import type { HttpContext } from '@adonisjs/core/http'
import Vehicle from '#models/vehicle'
import SeatLayout from '#models/seat_layout'
import OrganizationMember from '#models/organization_member'
import { SeatLayoutService } from '#services/seat_layout_service'
import {
  createSeatLayoutValidator,
  updateSeatLayoutValidator,
} from '#validators/seat_layout_validator'

const seatLayoutService = new SeatLayoutService()

/**
 * Resolve the vehicle from vehicleId param and verify the requesting user
 * has permission (owner or org admin/manager). Super admins always pass.
 * Returns the vehicle or throws a response early.
 */
async function resolveVehicleWithPermission(ctx: HttpContext): Promise<Vehicle | null> {
  const { params, response } = ctx
  const user = ctx.auth.user!

  const vehicle = await Vehicle.query()
    .where('id', params.vehicleId)
    .where('is_active', true)
    .firstOrFail()

  if (user.isSuperAdmin) return vehicle

  const isOwner = vehicle.ownerUserId === user.id

  const isOrgAdmin =
    vehicle.organizationId !== null &&
    (await OrganizationMember.query()
      .where('organization_id', vehicle.organizationId)
      .where('user_id', user.id)
      .where('is_active', true)
      .whereIn('role', ['owner', 'manager', 'org_admin'])
      .first()) !== null

  if (!isOwner && !isOrgAdmin) {
    response.forbidden({
      success: false,
      error: { code: 'E_FORBIDDEN', message: 'You do not have permission to manage layouts for this vehicle' },
    })
    return null
  }

  return vehicle
}

export default class SeatLayoutsController {
  /**
   * GET /api/v1/vehicles/:vehicleId/seat-layouts
   */
  async index(ctx: HttpContext) {
    const { params, response } = ctx

    // Validate vehicle exists and is accessible (public read allowed)
    const vehicle = await Vehicle.query()
      .where('id', params.vehicleId)
      .where('is_active', true)
      .firstOrFail()

    const layouts = await seatLayoutService.list(vehicle.id)

    return response.ok({ success: true, data: layouts })
  }

  /**
   * POST /api/v1/vehicles/:vehicleId/seat-layouts
   */
  async store(ctx: HttpContext) {
    const { request, response } = ctx

    const vehicle = await resolveVehicleWithPermission(ctx)
    if (!vehicle) return

    const data = await request.validateUsing(createSeatLayoutValidator)

    // Validate layout data
    const validation = seatLayoutService.validateLayout(
      data.layoutData as any,
      data.rows,
      data.columns
    )

    if (!validation.valid) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_INVALID_LAYOUT',
          message: 'Layout validation failed',
          details: validation.errors,
        },
      })
    }

    const layout = await seatLayoutService.create(vehicle.id, {
      name: data.name,
      rows: data.rows,
      columns: data.columns,
      layoutData: data.layoutData as any,
      isDefault: data.isDefault,
    })

    return response.created({ success: true, data: layout })
  }

  /**
   * GET /api/v1/vehicles/:vehicleId/seat-layouts/:id
   */
  async show(ctx: HttpContext) {
    const { params, response } = ctx

    // Confirm vehicle exists
    await Vehicle.query()
      .where('id', params.vehicleId)
      .where('is_active', true)
      .firstOrFail()

    const layout = await SeatLayout.query()
      .where('id', params.id)
      .where('vehicle_id', params.vehicleId)
      .where('is_active', true)
      .firstOrFail()

    return response.ok({ success: true, data: layout })
  }

  /**
   * PUT /api/v1/vehicles/:vehicleId/seat-layouts/:id
   */
  async update(ctx: HttpContext) {
    const { params, request, response } = ctx

    const vehicle = await resolveVehicleWithPermission(ctx)
    if (!vehicle) return

    // Verify layout belongs to this vehicle
    const layout = await SeatLayout.query()
      .where('id', params.id)
      .where('vehicle_id', vehicle.id)
      .where('is_active', true)
      .firstOrFail()

    const data = await request.validateUsing(updateSeatLayoutValidator)

    // If layoutData provided, validate it
    if (data.layoutData) {
      const rows = data.rows ?? layout.rows
      const columns = data.columns ?? layout.columns

      const validation = seatLayoutService.validateLayout(
        data.layoutData as any,
        rows,
        columns
      )

      if (!validation.valid) {
        return response.unprocessableEntity({
          success: false,
          error: {
            code: 'E_INVALID_LAYOUT',
            message: 'Layout validation failed',
            details: validation.errors,
          },
        })
      }
    }

    const updated = await seatLayoutService.update(layout.id, {
      name: data.name,
      rows: data.rows,
      columns: data.columns,
      layoutData: data.layoutData as any,
      isDefault: data.isDefault,
    })

    return response.ok({ success: true, data: updated })
  }

  /**
   * DELETE /api/v1/vehicles/:vehicleId/seat-layouts/:id — soft delete
   */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx

    const vehicle = await resolveVehicleWithPermission(ctx)
    if (!vehicle) return

    const layout = await SeatLayout.query()
      .where('id', params.id)
      .where('vehicle_id', vehicle.id)
      .where('is_active', true)
      .firstOrFail()

    // Prevent deleting the only remaining layout
    const activeCount = await SeatLayout.query()
      .where('vehicle_id', vehicle.id)
      .where('is_active', true)
      .count('* as total')

    if (Number((activeCount[0] as any).$extras.total) <= 1) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_LAST_LAYOUT',
          message: 'Cannot delete the last remaining layout for a vehicle',
        },
      })
    }

    await seatLayoutService.delete(layout.id)

    return response.ok({ success: true, data: { message: 'Seat layout deactivated' } })
  }

  /**
   * PUT /api/v1/vehicles/:vehicleId/seat-layouts/:id/default
   */
  async setDefault(ctx: HttpContext) {
    const { params, response } = ctx

    const vehicle = await resolveVehicleWithPermission(ctx)
    if (!vehicle) return

    // Verify layout belongs to this vehicle
    const layout = await SeatLayout.query()
      .where('id', params.id)
      .where('vehicle_id', vehicle.id)
      .where('is_active', true)
      .firstOrFail()

    await seatLayoutService.setDefault(vehicle.id, layout.id)

    const updated = await SeatLayout.findOrFail(layout.id)

    return response.ok({ success: true, data: updated })
  }
}
