import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Trip from '#models/trip'
import User from '#models/user'
import TripStop from '#models/trip_stop'
import BookingSeat from '#models/booking_seat'

export type BookingStatus = 'pending' | 'confirmed' | 'boarded' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export default class Booking extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reference: string

  @column()
  declare tripId: number

  @column()
  declare passengerUserId: number | null

  @column()
  declare boardingStopId: number

  @column()
  declare alightingStopId: number

  @column()
  declare boardingStopOrder: number

  @column()
  declare alightingStopOrder: number

  @column()
  declare passengerName: string

  @column()
  declare passengerPhone: string | null

  @column()
  declare status: BookingStatus

  @column()
  declare totalAmountCdf: number

  @column()
  declare totalAmountUsd: number | null

  @column()
  declare currency: string

  @column()
  declare paymentStatus: PaymentStatus

  @column({ serializeAs: null })
  declare qrCode: string | null

  @column()
  declare bookedByUserId: number | null

  @column()
  declare notes: string | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column()
  declare cancellationReason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => User, { foreignKey: 'passengerUserId' })
  declare passenger: BelongsTo<typeof User>

  @belongsTo(() => TripStop, { foreignKey: 'boardingStopId' })
  declare boardingStop: BelongsTo<typeof TripStop>

  @belongsTo(() => TripStop, { foreignKey: 'alightingStopId' })
  declare alightingStop: BelongsTo<typeof TripStop>

  @hasMany(() => BookingSeat)
  declare seats: HasMany<typeof BookingSeat>
}
