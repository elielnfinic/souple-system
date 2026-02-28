import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs on every HTTP request.
 * Note: Order matters — Shield must run before auth.
 */
server.use([
  () => import('#middleware/cors_middleware'),        // Must be first — handles OPTIONS preflights
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/audit_middleware'),
])

/**
 * Named middleware collection. These can be referenced in route definitions.
 */
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  tenant: () => import('#middleware/tenant_middleware'),
  role: () => import('#middleware/role_middleware'),
})
