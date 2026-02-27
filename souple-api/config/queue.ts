import { defineConfig, drivers } from '@adonisjs/queue'

const queueConfig = defineConfig({
  default: 'redis',
  adapters: {
    redis: drivers.redis({ connectionName: 'main' }),
  },
})

export default queueConfig
