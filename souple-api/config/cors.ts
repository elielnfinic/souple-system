/**
 * CORS configuration for souple-api.
 * In AdonisJS 6, CORS is part of the @adonisjs/core package.
 */
export default {
  enabled: true,
  // In production set to your actual frontend domains.
  // true = reflect the Origin header (mirrors any origin — OK for dev)
  origin: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
}
