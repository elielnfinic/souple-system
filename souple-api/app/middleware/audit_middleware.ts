import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AuditLog from '#models/audit_log'

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// Map HTTP method + path pattern to a human-readable action
function deriveAction(method: string, url: string): string {
  const segments = url.replace(/^\/api\/v\d+\//, '').split('/').filter(Boolean)
  const resource = segments[0] ?? 'unknown'
  const isUpdate = segments.length > 1 && !isNaN(Number(segments[1]))

  switch (method) {
    case 'POST':
      return `${resource}.create`
    case 'PUT':
    case 'PATCH':
      return isUpdate ? `${resource}.update` : `${resource}.bulk_update`
    case 'DELETE':
      return isUpdate ? `${resource}.delete` : `${resource}.bulk_delete`
    default:
      return `${resource}.${method.toLowerCase()}`
  }
}

function deriveEntityType(url: string): string {
  const segments = url.replace(/^\/api\/v\d+\//, '').split('/').filter(Boolean)
  return segments[0] ?? 'unknown'
}

function deriveEntityId(url: string): number | null {
  const segments = url.replace(/^\/api\/v\d+\//, '').split('/').filter(Boolean)
  const id = segments[1]
  return id && !isNaN(Number(id)) ? Number(id) : null
}

export default class AuditMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!MUTATING_METHODS.includes(ctx.request.method())) {
      return next()
    }

    // Capture request body snapshot before processing
    const requestBody = ctx.request.body()

    await next()

    // Only log if the request was handled (status < 500)
    const statusCode = ctx.response.getStatus()
    if (statusCode >= 500) return

    // Don't log auth endpoints (passwords, OTPs in body)
    const url = ctx.request.url()
    if (url.includes('/auth/')) return

    try {
      const user = ctx.auth.isAuthenticated ? ctx.auth.user : null
      const method = ctx.request.method()

      await AuditLog.create({
        organizationId: ctx.organization?.id ?? null,
        userId: user?.id ?? null,
        action: deriveAction(method, url),
        entityType: deriveEntityType(url),
        entityId: deriveEntityId(url),
        oldValues: null, // Populated by service layer for updates
        newValues: method === 'DELETE' ? null : (requestBody as Record<string, unknown>),
        ipAddress: ctx.request.ip(),
        userAgent: ctx.request.header('User-Agent') ?? null,
      })
    } catch {
      // Audit failures must never break the request
    }
  }
}
