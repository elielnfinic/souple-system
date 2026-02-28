import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Booking from '#models/booking'
import ConversationParticipant from '#models/conversation_participant'
import Message from '#models/message'

export default class Conversation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare bookingId: number | null

  @column()
  declare type: 'direct' | 'support' | 'system'

  @column()
  declare title: string | null

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastMessageAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @hasMany(() => ConversationParticipant)
  declare participants: HasMany<typeof ConversationParticipant>

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>
}
