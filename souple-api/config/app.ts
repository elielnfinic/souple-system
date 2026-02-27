import { defineConfig } from '@adonisjs/core/http'

export default {
  /*
  |--------------------------------------------------------------------------
  | HTTP server configuration
  |--------------------------------------------------------------------------
  */
  http: defineConfig({
    generateRequestId: false,
    allowMethodSpoofing: false,
    trustProxy: false,
    subdomainOffset: 2,
    useAsyncLocalStorage: false,
    cookie: {
      maxAge: '2h',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
  }),
}
