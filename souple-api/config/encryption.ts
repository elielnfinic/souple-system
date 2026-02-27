import { defineConfig, drivers } from '@adonisjs/core/encryption'
import env from '#start/env'

export default defineConfig({
  default: 'aes256gcm',
  list: {
    aes256gcm: drivers.aes256gcm({
      id: 'v1',
      keys: [env.get('APP_KEY')],
    }),
  },
})
