import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Conversation from '#models/conversation'
import User from '#models/user'

export default class Message extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare conversationId: number

  @column()
  declare senderUserId: number | null

  @column()
  declare content: string

  @column()
  declare type: 'text' | 'system' | 'image'

  @column.dateTime()
  declare readAt: DateTime | null

  @column()
  declare isDeleted: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Conversation)
  declare conversation: BelongsTo<typeof Conversation>

  @belongsTo(() => User, { foreignKey: 'senderUserId' })
  declare sender: BelongsTo<typeof User>
}
