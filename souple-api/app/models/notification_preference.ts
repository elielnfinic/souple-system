import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class NotificationPreference extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare emailEnabled: boolean

  @column()
  declare smsEnabled: boolean

  @column()
  declare pushEnabled: boolean

  @column()
  declare telegramEnabled: boolean

  @column()
  declare bookingUpdates: boolean

  @column()
  declare tripUpdates: boolean

  @column()
  declare promotions: boolean

  @column()
  declare news: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
