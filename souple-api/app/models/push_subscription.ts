import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class PushSubscription extends BaseModel {
  static table = 'push_subscriptions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare endpoint: string

  @column()
  declare p256dhKey: string

  @column()
  declare authKey: string

  @column()
  declare userAgent: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
