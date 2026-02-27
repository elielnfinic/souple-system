import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Guards routes by requiring a valid access token.
 * Throws E_UNAUTHORIZED_ACCESS if no valid token is present.
 */
export default class AuthMiddleware {
  async handle({ auth }: HttpContext, next: NextFn) {
    await auth.authenticate()
    return next()
  }
}
