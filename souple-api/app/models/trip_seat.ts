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
  declare seatIdentifier: string

  @column()
  declare seatClass: string

  @column()
  declare fullTripPrice: number

  @column()
  declare currency: string

  @column()
  declare isBlocked: boolean

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare features: string[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>
}
