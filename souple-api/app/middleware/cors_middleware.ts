import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * CORS middleware.
 *
 * In development: reflects any Origin back (permissive).
 * In production:  restricts to FRONTEND_URL (and optional CORS_ORIGINS).
 *
 * Handles preflight OPTIONS requests and adds headers to every response.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function getAllowedOrigins(): string[] | true {
  if (!IS_PRODUCTION) return true // any origin in dev

  const origins: string[] = []
  const front = process.env.FRONTEND_URL
  if (front) origins.push(front)

  const extra = process.env.CORS_ORIGINS
  if (extra) {
    extra
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => origins.push(o))
  }

  return origins.length > 0 ? origins : []
}

const ALLOWED_ORIGINS = getAllowedOrigins()
const ALLOW_METHODS = 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS'
const MAX_AGE = '90'

export default class CorsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx
    const origin = request.header('origin')

    // Determine if this origin is allowed
    let allowOrigin: string | undefined

    if (ALLOWED_ORIGINS === true) {
      // Reflect any origin
      allowOrigin = origin ?? '*'
    } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
      allowOrigin = origin
    }

    if (allowOrigin) {
      response.header('Access-Control-Allow-Origin', allowOrigin)
      response.header('Access-Control-Allow-Credentials', 'true')
      response.header('Access-Control-Allow-Methods', ALLOW_METHODS)
      response.header('Vary', 'Origin')
    }

    // Preflight: respond immediately with allowed headers
    if (request.method() === 'OPTIONS') {
      const requestedHeaders = request.header('access-control-request-headers')
      response.header(
        'Access-Control-Allow-Headers',
        requestedHeaders ?? 'Content-Type,Authorization,X-Organization-Id,Accept'
      )
      response.header('Access-Control-Max-Age', MAX_AGE)
      response.status(204).send('')
      return
    }

    await next()
  }
}
