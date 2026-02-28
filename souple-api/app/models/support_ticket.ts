import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'
import Booking from '#models/booking'
import TicketMessage from '#models/ticket_message'

export default class SupportTicket extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reference: string

  @column()
  declare userId: number | null

  @column()
  declare organizationId: number | null

  @column()
  declare bookingId: number | null

  @column()
  declare category: 'booking' | 'payment' | 'delay' | 'luggage' | 'driver' | 'refund' | 'other'

  @column()
  declare priority: 'low' | 'normal' | 'high' | 'urgent'

  @column()
  declare status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'

  @column()
  declare title: string

  @column.dateTime()
  declare resolvedAt: DateTime | null

  @column()
  declare satisfactionRating: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @hasMany(() => TicketMessage)
  declare messages: HasMany<typeof TicketMessage>
}
