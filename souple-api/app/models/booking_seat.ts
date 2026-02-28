import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import TripSeat from '#models/trip_seat'

export default class BookingSeat extends BaseModel {
  static table = 'booking_seats'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingId: number

  @column()
  declare tripSeatId: number

  @column()
  declare passengerName: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => TripSeat)
  declare tripSeat: BelongsTo<typeof TripSeat>
}
