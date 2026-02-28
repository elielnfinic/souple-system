import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Conversation from '#models/conversation'

export default class Message extends BaseModel {
  @column({ isPrimary: true }) declare id: number
  @column() declare conversationId: number
  @column() declare senderId: number
  @column() declare content: string
  @column() declare type: 'text' | 'image' | 'system'
  @column() declare imageUrl: string | null
  @column() declare isRead: boolean
  @column.dateTime() declare readAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime

  @belongsTo(() => Conversation) declare conversation: BelongsTo<typeof Conversation>
  @belongsTo(() => User, { foreignKey: 'senderId' }) declare sender: BelongsTo<typeof User>
}
