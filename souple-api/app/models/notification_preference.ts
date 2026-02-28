import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import type { NotificationChannel } from '#models/notification'

export default class NotificationPreference extends BaseModel {
  static table = 'notification_preferences'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare channel: NotificationChannel

  @column()
  declare type: string // notification type or '*' for all

  @column()
  declare enabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
