import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  // AWS S3
  DRIVE_DISK: Env.schema.enum(['fs', 's3'] as const),
  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  AWS_REGION: Env.schema.string.optional(),
  AWS_S3_BUCKET: Env.schema.string.optional(),

  // Email (SMTP)
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string.optional(),
  MAIL_FROM_NAME: Env.schema.string.optional(),

  FRONTEND_URL: Env.schema.string(),
  SMS_PROVIDER: Env.schema.string.optional(),

  // Africa's Talking SMS
  AT_API_KEY: Env.schema.string.optional(),
  AT_USERNAME: Env.schema.string.optional(),
  AT_SENDER_ID: Env.schema.string.optional(),

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: Env.schema.string.optional(),

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY: Env.schema.string.optional(),
  VAPID_PRIVATE_KEY: Env.schema.string.optional(),
  VAPID_SUBJECT: Env.schema.string.optional(),
})
