import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { OrgRole } from '@souple/shared'
import { ROLE_HIERARCHY } from '@souple/shared/constants'

export default class RoleMiddleware {
  /**
   * Usage in routes:
   *   .use(middleware.role(['owner', 'manager']))
   *
   * Allows super admins to bypass all role checks.
   * Requires TenantMiddleware to have run first.
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { roles: OrgRole[] } | OrgRole[]
  ) {
    const user = ctx.auth.user!
    const allowedRoles = Array.isArray(options) ? options : options.roles

    // Super admins bypass all RBAC checks
    if (user.isSuperAdmin) {
      return next()
    }

    const membership = ctx.membership
    if (!membership) {
      return ctx.response.forbidden({
        success: false,
        error: {
          code: 'E_FORBIDDEN',
          message: 'You are not a member of this organization',
        },
      })
    }

    const userRoleLevel = ROLE_HIERARCHY[membership.role]
    const hasPermission = allowedRoles.some(
      (role) => ROLE_HIERARCHY[role] <= userRoleLevel
    )

    if (!hasPermission) {
      return ctx.response.forbidden({
        success: false,
        error: {
          code: 'E_FORBIDDEN',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
      })
    }

    return next()
  }
}
