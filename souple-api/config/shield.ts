import { defineConfig } from '@adonisjs/shield'

export default defineConfig({
  csrf: {
    enabled: false, // Disabled — we use token-based auth, not session-based
  },
  csp: {
    enabled: false, // Managed at Nginx level in production
  },
  dnsPrefetchControl: {
    enabled: true,
    allow: false,
  },
  frameGuard: {
    enabled: true,
    action: 'DENY',
  },
  hsts: {
    enabled: true,
    maxAge: 180,
    includeSubDomains: true,
    preload: false,
  },
  ieNoOpen: {
    enabled: true,
  },
  noSniff: {
    enabled: true,
  },
  referrerPolicy: {
    enabled: true,
    policy: 'strict-origin-when-cross-origin',
  },
  xssProtection: {
    enabled: true,
    mode: 'block',
  },
})
