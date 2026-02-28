import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Trip from '#models/trip'
import TripSeat from '#models/trip_seat'
import User from '#models/user'

export default class SeatReservation extends BaseModel {
  static table = 'seat_reservations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tripId: number

  @column()
  declare tripSeatId: number

  @column()
  declare userId: number | null

  @column()
  declare boardingStopOrder: number

  @column()
  declare alightingStopOrder: number

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare reservedUntil: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => TripSeat)
  declare tripSeat: BelongsTo<typeof TripSeat>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
