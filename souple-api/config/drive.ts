import { defineConfig } from '@adonisjs/drive'
import { services } from '@adonisjs/drive'
import env from '#start/env'

export default defineConfig({
  default: env.get('DRIVE_DISK'),
  services: {
    fs: services.fs({
      location: new URL('../uploads', import.meta.url),
      serveFiles: true,
      routeBasePath: '/uploads',
    }),
    s3: services.s3({
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
      },
      region: env.get('AWS_REGION', 'af-south-1'),
      bucket: env.get('AWS_S3_BUCKET', 'souple-f'),
      visibility: 'private',
    }),
  },
})
