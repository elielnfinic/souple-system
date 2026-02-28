import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Conversation from '#models/conversation'
import User from '#models/user'

export default class ConversationParticipant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare conversationId: number

  @column()
  declare userId: number

  @column()
  declare unreadCount: number

  @column.dateTime()
  declare lastReadAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Conversation)
  declare conversation: BelongsTo<typeof Conversation>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
