import env from '#start/env'

/**
 * CORS configuration for souple-api.
 *
 * Dev  — reflects any origin (mirrors request Origin header).
 * Prod — restricts to the FRONTEND_URL env var (and any extra
 *        comma-separated origins in CORS_ORIGINS).
 */

const isProduction = env.get('NODE_ENV') === 'production'

function getAllowedOrigins(): string | string[] | boolean {
  if (!isProduction) {
    // Reflect any origin in development — safe behind localhost
    return true
  }

  const origins: string[] = []

  const frontendUrl = env.get('FRONTEND_URL', '')
  if (frontendUrl) {
    origins.push(frontendUrl)
  }

  // Optional: CORS_ORIGINS="https://admin.souple.app,https://agent.souple.app"
  const extra = env.get('CORS_ORIGINS', '')
  if (extra) {
    extra
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => origins.push(o))
  }

  return origins.length > 0 ? origins : false
}

export default {
  enabled: true,

  /**
   * Allowed origins.
   * - Development : true  (reflect any Origin)
   * - Production  : explicit list from env vars
   */
  origin: getAllowedOrigins(),

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * true = reflect all request headers as allowed.
   * In prod you could narrow to specific headers if needed.
   */
  headers: true,

  exposeHeaders: [],

  /**
   * Allow cookies / Authorization header to be sent cross-origin.
   * Required for the Bearer token + refresh-token cookie flow.
   */
  credentials: true,

  /** Pre-flight cache duration (seconds) */
  maxAge: 90,
}
