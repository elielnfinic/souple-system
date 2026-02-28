import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'

export default class TripShare extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingId: number

  @column()
  declare shareToken: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>
}
