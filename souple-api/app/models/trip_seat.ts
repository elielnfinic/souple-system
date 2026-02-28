import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Trip from '#models/trip'

export default class TripSeat extends BaseModel {
  static table = 'trip_seats'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tripId: number

  @column()
  declare seatId: string

  @column()
  declare seatLabel: string | null

  @column()
  declare seatClass: string | null

  @column()
  declare seatRow: number

  @column()
  declare seatCol: number

  @column()
  declare isBookable: boolean

  @column()
  declare priceMultiplier: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>
}
