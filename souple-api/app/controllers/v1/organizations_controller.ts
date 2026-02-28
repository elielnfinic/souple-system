import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Organization from '#models/organization'
import OrganizationMember from '#models/organization_member'
import User from '#models/user'
import {
  createOrganizationValidator,
  updateOrganizationValidator,
  addMemberValidator,
  updateMemberRoleValidator,
} from '#validators/organization_validator'
import string from '@adonisjs/core/helpers/string'

export default class OrganizationsController {
  /**
   * GET /api/v1/organizations
   * Super admin: all orgs. User: orgs they belong to.
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)

    let query = Organization.query()

    if (!user.isSuperAdmin) {
      // Users only see their own orgs
      const memberOrgIds = await OrganizationMember.query()
        .where('user_id', user.id)
        .where('is_active', true)
        .select('organization_id')

      query = query.whereIn('id', memberOrgIds.map((m) => m.organizationId))
    }

    if (request.input('search')) {
      query.where('name', 'like', `%${request.input('search')}%`)
    }

    if (!user.isSuperAdmin) {
      query.where('is_active', true)
    }

    const paginated = await query.orderBy('name', 'asc').paginate(page, perPage)
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
   * POST /api/v1/organizations
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(createOrganizationValidator)

    // Generate unique slug
    let slug = string.slug(data.name)
    const exists = await Organization.findBy('slug', slug)
    if (exists) {
      slug = `${slug}-${string.generateRandom(4).toLowerCase()}`
    }

    const org = await Organization.create({
      ...data,
      slug,
      country: data.country ?? 'CD',
      isActive: true,
    })

    // Creator becomes owner
    await OrganizationMember.create({
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
      isActive: true,
      joinedAt: DateTime.utc(),
    })

    return response.created({ success: true, data: org })
  }

  /**
   * GET /api/v1/organizations/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const org = await Organization.query()
      .where('id', params.id)
      .preload('members', (q) => q.where('is_active', true).preload('user'))
      .firstOrFail()

    // Non-admins can only view orgs they belong to
    if (!user.isSuperAdmin) {
      const isMember = org.members.some((m) => m.userId === user.id)
      if (!isMember && !org.isPublic) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied' },
        })
      }
    }

    return response.ok({ success: true, data: org })
  }

  /**
   * PUT /api/v1/organizations/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const org = await Organization.findOrFail(params.id)
    const data = await request.validateUsing(updateOrganizationValidator)

    // Only org owners/managers or super admins can update
    if (!user.isSuperAdmin) {
      const membership = await OrganizationMember.query()
        .where('organization_id', org.id)
        .where('user_id', user.id)
        .where('is_active', true)
        .whereIn('role', ['owner', 'manager'])
        .first()

      if (!membership) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Insufficient permissions' },
        })
      }
    }

    org.merge(data)
    await org.save()

    return response.ok({ success: true, data: org })
  }

  /**
   * DELETE /api/v1/organizations/:id — soft delete
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Super admin access required' },
      })
    }

    const org = await Organization.findOrFail(params.id)
    org.isActive = false
    await org.save()

    return response.ok({ success: true, data: { message: 'Organization deactivated' } })
  }

  // ─── Members ─────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/organizations/:id/members
   */
  async addMember({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const org = await Organization.findOrFail(params.id)
    const data = await request.validateUsing(addMemberValidator)

    // Only owners/admins can manage members
    if (!user.isSuperAdmin) {
      const membership = await OrganizationMember.query()
        .where('organization_id', org.id)
        .where('user_id', user.id)
        .where('is_active', true)
        .whereIn('role', ['owner', 'manager'])
        .first()

      if (!membership) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Insufficient permissions' },
        })
      }
    }

    // Find target user by userId or phone
    let targetUser: User | null = null
    if (data.userId) {
      targetUser = await User.findOrFail(data.userId)
    } else if (data.phone) {
      targetUser = await User.findBy('phone', data.phone)
      if (!targetUser) {
        return response.notFound({
          success: false,
          error: { code: 'E_NOT_FOUND', message: 'No account found with this phone number' },
        })
      }
    } else {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Either userId or phone is required' },
      })
    }

    const existing = await OrganizationMember.query()
      .where('organization_id', org.id)
      .where('user_id', targetUser.id)
      .first()

    if (existing) {
      if (existing.isActive) {
        return response.conflict({
          success: false,
          error: { code: 'E_CONFLICT', message: 'User is already a member of this organization' },
        })
      }
      // Re-activate
      existing.isActive = true
      existing.role = data.role
      existing.joinedAt = DateTime.utc()
      await existing.save()
      return response.ok({ success: true, data: existing })
    }

    const member = await OrganizationMember.create({
      organizationId: org.id,
      userId: targetUser.id,
      role: data.role,
      isActive: true,
      joinedAt: DateTime.utc(),
    })

    return response.created({ success: true, data: member })
  }

  /**
   * DELETE /api/v1/organizations/:id/members/:userId
   */
  async removeMember({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const org = await Organization.findOrFail(params.id)

    if (!user.isSuperAdmin) {
      const membership = await OrganizationMember.query()
        .where('organization_id', org.id)
        .where('user_id', user.id)
        .where('is_active', true)
        .whereIn('role', ['owner', 'manager'])
        .first()

      if (!membership) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Insufficient permissions' },
        })
      }
    }

    const member = await OrganizationMember.query()
      .where('organization_id', org.id)
      .where('user_id', params.userId)
      .where('is_active', true)
      .firstOrFail()

    member.isActive = false
    await member.save()

    return response.ok({ success: true, data: { message: 'Member removed' } })
  }

  /**
   * PUT /api/v1/organizations/:id/members/:userId
   */
  async updateMemberRole({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const org = await Organization.findOrFail(params.id)
    const data = await request.validateUsing(updateMemberRoleValidator)

    if (!user.isSuperAdmin) {
      const membership = await OrganizationMember.query()
        .where('organization_id', org.id)
        .where('user_id', user.id)
        .where('is_active', true)
        .where('role', 'owner')
        .first()

      if (!membership) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Only owners can change member roles' },
        })
      }
    }

    const member = await OrganizationMember.query()
      .where('organization_id', org.id)
      .where('user_id', params.userId)
      .where('is_active', true)
      .firstOrFail()

    member.role = data.role
    await member.save()

    return response.ok({ success: true, data: member })
  }
}
