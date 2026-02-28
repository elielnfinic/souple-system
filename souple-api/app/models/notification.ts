import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export type NotificationChannel = 'in_app' | 'sms' | 'email' | 'push' | 'telegram'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read'

export default class Notification extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number | null

  @column()
  declare title: string

  @column()
  declare body: string

  @column()
  declare channel: NotificationChannel

  @column()
  declare type: string

  @column()
  declare status: NotificationStatus

  @column({
    prepare: (v) => JSON.stringify(v),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare data: Record<string, any> | null

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column()
  declare failedReason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
