import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Vehicle from '#models/vehicle'
import OrganizationMember from '#models/organization_member'
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
   *
   * - No auth: public listing (verified + public only)
   * - Super admin: all vehicles with full filters
   * - Org admin/manager: vehicles scoped to their org (via X-Organization-Id)
   * - Authenticated user without org header: own vehicles
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx

    // Silently authenticate — allows both authenticated and guest access
    await ctx.auth.check()

    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const type = request.input('type')
    // Accept both 'verificationStatus' (frontend) and 'status' (legacy) param names
    const status = request.input('verificationStatus') ?? request.input('status')
    const visibility = request.input('visibility')
    const search = request.input('search', '')

    const filters = { type, status, visibility, search, page, perPage }

    // Super admin: full unfiltered list
    if (ctx.auth.isAuthenticated && ctx.auth.user?.isSuperAdmin) {
      const query = Vehicle.query()

      if (type) query.where('type', type)
      if (status) query.where('verification_status', status)
      if (visibility) query.where('visibility', visibility)
      if (search) {
        query.where((q) => {
          q.where('brand', 'like', `%${search}%`)
            .orWhere('model', 'like', `%${search}%`)
            .orWhere('plate_number', 'like', `%${search}%`)
        })
      }

      const paginated = await query.orderBy('created_at', 'desc').paginate(page, perPage)
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

    // Org-scoped listing for org members
    if (ctx.auth.isAuthenticated && ctx.organization) {
      const result = await vehicleService.listByOrg(ctx.organization.id, filters)
      return response.ok({ success: true, data: result.data, meta: result.meta })
    }

    // Authenticated user without org: own vehicles
    if (ctx.auth.isAuthenticated && ctx.auth.user) {
      const userId = ctx.auth.user.id
      const query = Vehicle.query().where('owner_user_id', userId).where('is_active', true)

      if (type) query.where('type', type)
      if (search) {
        query.where((q) => {
          q.where('brand', 'like', `%${search}%`)
            .orWhere('model', 'like', `%${search}%`)
            .orWhere('plate_number', 'like', `%${search}%`)
        })
      }

      const paginated = await query.orderBy('created_at', 'desc').paginate(page, perPage)
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

    // Public, unauthenticated: verified & public vehicles only
    const result = await vehicleService.listPublic(filters)
    return response.ok({ success: true, data: result.data, meta: result.meta })
  }

  /**
   * POST /api/v1/vehicles
   * Requires auth. Org ID comes from X-Organization-Id if the user is an org member.
   */
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(createVehicleValidator)

    let orgId: number | undefined

    if (ctx.organization) {
      // Verify the user is an active member of the org
      if (!user.isSuperAdmin) {
        const membership = await OrganizationMember.query()
          .where('organization_id', ctx.organization.id)
          .where('user_id', user.id)
          .where('is_active', true)
          .whereIn('role', ['owner', 'manager', 'org_admin'])
          .first()

        if (!membership) {
          return response.forbidden({
            success: false,
            error: { code: 'E_FORBIDDEN', message: 'Insufficient permissions within this organization' },
          })
        }
      }
      orgId = ctx.organization.id
    }

    const vehicle = await vehicleService.create(
      {
        type: data.type as any,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        plateNumber: data.plateNumber,
        chassisNumber: data.chassisNumber,
        totalSeats: data.totalSeats,
        visibility: data.visibility as any,
        isAvailableForRental: data.isAvailableForRental,
        features: data.features,
        insuranceExpiry: data.insuranceExpiry
          ? DateTime.fromJSDate(data.insuranceExpiry as unknown as Date).toUTC()
          : undefined,
        technicalVisitExpiry: data.technicalVisitExpiry
          ? DateTime.fromJSDate(data.technicalVisitExpiry as unknown as Date).toUTC()
          : undefined,
      },
      user.id,
      orgId
    )

    return response.created({ success: true, data: vehicle })
  }

  /**
   * GET /api/v1/vehicles/:id
   * Returns vehicle with its seat layouts. Auth optional.
   */
  async show(ctx: HttpContext) {
    const { params, response } = ctx

    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .preload('seatLayouts', (q) => q.where('is_active', true).orderBy('is_default', 'desc'))
      .firstOrFail()

    // Non-admins cannot see private or inactive vehicles they don't own
    if (!vehicle.isActive) {
      if (!ctx.auth.isAuthenticated || !ctx.auth.user?.isSuperAdmin) {
        return response.notFound({
          success: false,
          error: { code: 'E_NOT_FOUND', message: 'Vehicle not found' },
        })
      }
    }

    if (vehicle.visibility === 'private' && !ctx.auth.isAuthenticated) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'This vehicle is private' },
      })
    }

    if (ctx.auth.isAuthenticated && !ctx.auth.user?.isSuperAdmin && vehicle.visibility === 'private') {
      const user = ctx.auth.user!
      const isOwner = vehicle.ownerUserId === user.id
      const isOrgMember =
        vehicle.organizationId !== null &&
        (await OrganizationMember.query()
          .where('organization_id', vehicle.organizationId)
          .where('user_id', user.id)
          .where('is_active', true)
          .first()) !== null

      if (!isOwner && !isOrgMember) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this private vehicle' },
        })
      }
    }

    return response.ok({ success: true, data: vehicle })
  }

  /**
   * PUT /api/v1/vehicles/:id
   * Owner or org admin/manager can update.
   */
  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user!

    const vehicle = await Vehicle.findOrFail(params.id)
    const data = await request.validateUsing(updateVehicleValidator)

    if (!user.isSuperAdmin) {
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
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'You do not have permission to update this vehicle' },
        })
      }
    }

    const updated = await vehicleService.update(vehicle.id, data as any)

    return response.ok({ success: true, data: updated })
  }

  /**
   * DELETE /api/v1/vehicles/:id — soft delete
   */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const vehicle = await Vehicle.findOrFail(params.id)

    if (!user.isSuperAdmin) {
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
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'You do not have permission to delete this vehicle' },
        })
      }
    }

    await vehicleService.softDelete(vehicle.id)

    return response.ok({ success: true, data: { message: 'Vehicle deactivated' } })
  }

  /**
   * PUT /api/v1/vehicles/:id/verify — super_admin only
   */
  async verify(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user!

    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const data = await request.validateUsing(verifyVehicleValidator)

    await vehicleService.verify(params.id, data.status as any, data.notes)

    const vehicle = await Vehicle.findOrFail(params.id)

    return response.ok({ success: true, data: vehicle })
  }

  /**
   * POST /api/v1/vehicles/:id/photos
   * Multipart file upload — stub: saves file to /tmp and stores local path.
   * Real S3 upload is deferred to Skill 08.
   */
  async uploadPhoto(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user!

    const vehicle = await Vehicle.findOrFail(params.id)

    if (!user.isSuperAdmin) {
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
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'You do not have permission to upload photos for this vehicle' },
        })
      }
    }

    const photo = request.file('photo', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!photo) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'A photo file is required' },
      })
    }

    if (!photo.isValid) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'Invalid photo file',
          details: photo.errors,
        },
      })
    }

    const isPrimary = request.input('is_primary', false) === 'true' || request.input('is_primary') === true

    // Stub: move to /tmp, store local path as URL
    const fileName = `vehicle_${vehicle.id}_${Date.now()}.${photo.extname}`
    await photo.move('/tmp', { name: fileName, overwrite: true })

    const key = `vehicles/${vehicle.id}/${fileName}`
    const url = `/tmp/${fileName}` // replaced by real S3 URL in Skill 08

    await vehicleService.uploadPhoto(vehicle.id, { url, key, isPrimary })

    const updated = await Vehicle.findOrFail(vehicle.id)

    return response.created({ success: true, data: updated })
  }

  /**
   * DELETE /api/v1/vehicles/:id/photos/:key
   * :key is base64-encoded to avoid slash conflicts.
   */
  async deletePhoto(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const vehicle = await Vehicle.findOrFail(params.id)

    if (!user.isSuperAdmin) {
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
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'You do not have permission to delete photos for this vehicle' },
        })
      }
    }

    // Key is provided URL-encoded in the path segment
    const key = decodeURIComponent(params.key)

    await vehicleService.deletePhoto(vehicle.id, key)

    const updated = await Vehicle.findOrFail(vehicle.id)

    return response.ok({ success: true, data: updated })
  }

  /**
   * GET /api/v1/vehicles/:id/availability
   * Stub — real availability logic is implemented in Skill 04 when trips exist.
   */
  async availability(ctx: HttpContext) {
    const { params, response } = ctx

    const vehicle = await Vehicle.findOrFail(params.id)

    if (!vehicle.isActive) {
      return response.ok({
        success: true,
        data: {
          vehicleId: vehicle.id,
          available: false,
          reason: 'Vehicle is not active',
        },
      })
    }

    return response.ok({
      success: true,
      data: {
        vehicleId: vehicle.id,
        available: true,
        // Real date-range availability implemented in Skill 04
      },
    })
  }
}
