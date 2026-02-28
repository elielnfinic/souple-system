import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class TelegramLink extends BaseModel {
  static table = 'telegram_links'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare telegramChatId: number

  @column()
  declare telegramUsername: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare linkedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
