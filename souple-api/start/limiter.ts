import limiter from '@adonisjs/limiter/services/main'

/**
 * Rate limiting rules for the Souple API.
 *
 * Global:       100 req/min (all requests)
 * Auth:          5 req/15 min per IP (login, register, send-otp)
 * Authenticated: 60 req/min per user
 */

export const globalLimiter = limiter.define('global', (ctx) => {
  return limiter.allowRequests(100).every('1 min').usingKey(`global:${ctx.request.ip()}`)
})

export const authLimiter = limiter.define('auth', (ctx) => {
  return limiter
    .allowRequests(5)
    .every('15 mins')
    .usingKey(`auth:${ctx.request.ip()}`)
    .limitExceeded((error) => {
      error.setStatus(429).setMessage(
        'Too many authentication attempts. Please wait 15 minutes before trying again.'
      )
    })
})

export const apiLimiter = limiter.define('api', (ctx) => {
  if (!ctx.auth.isAuthenticated) {
    return limiter.allowRequests(30).every('1 min').usingKey(`api:anon:${ctx.request.ip()}`)
  }

  return limiter
    .allowRequests(60)
    .every('1 min')
    .usingKey(`api:user:${ctx.auth.user!.id}`)
})
