import { defineConfig } from '@adonisjs/limiter'

export default defineConfig({
  default: 'redis',
  stores: {
    redis: () => import('@adonisjs/limiter/stores/redis'),
  },
})
