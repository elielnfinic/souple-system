import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Organization from '#models/organization'
import OrganizationMember from '#models/organization_member'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    organization?: InstanceType<typeof Organization>
    membership?: InstanceType<typeof OrganizationMember> | null
  }
}

export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const orgId =
      ctx.request.header('X-Organization-Id') ||
      ctx.params.organizationId ||
      ctx.request.input('organization_id')

    if (!orgId) {
      return next()
    }

    const numericOrgId = Number(orgId)
    if (isNaN(numericOrgId) || numericOrgId <= 0) {
      return ctx.response.badRequest({
        success: false,
        error: {
          code: 'E_INVALID_ORG',
          message: 'Invalid organization ID',
        },
      })
    }

    const org = await Organization.query()
      .where('id', numericOrgId)
      .where('is_active', true)
      .firstOrFail()

    ctx.organization = org

    // Attach membership if user is authenticated
    if (ctx.auth.isAuthenticated) {
      const user = await ctx.auth.user!
      ctx.membership = await OrganizationMember.query()
        .where('organization_id', org.id)
        .where('user_id', user.id)
        .where('is_active', true)
        .first()
    }

    return next()
  }
}
