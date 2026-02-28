import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Trip from '#models/trip'
import User from '#models/user'
import TripStop from '#models/trip_stop'
import BookingSeat from '#models/booking_seat'

export type BookingSource = 'web' | 'pos' | 'ussd' | 'whatsapp' | 'agent' | 'api' | 'corporate'
export type BookingType = 'individual' | 'group'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded'

export default class Booking extends BaseModel {
  static table = 'bookings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingCode: string

  @column()
  declare organizationId: number | null

  @column()
  declare tripId: number

  @column()
  declare userId: number | null

  @column()
  declare ticketerId: number | null

  @column()
  declare agentId: number | null

  @column()
  declare source: BookingSource

  @column()
  declare type: BookingType

  @column()
  declare passengerName: string

  @column()
  declare passengerPhone: string

  @column()
  declare passengerEmail: string | null

  @column()
  declare boardingStopId: number

  @column()
  declare alightingStopId: number

  @column()
  declare boardingStopOrder: number

  @column()
  declare alightingStopOrder: number

  @column()
  declare seatCount: number

  @column()
  declare totalAmount: number

  @column()
  declare currency: string

  @column()
  declare status: BookingStatus

  @column()
  declare qrCodeData: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare checkedInAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare checkedOutAt: DateTime | null

  @column()
  declare cancellationReason: string | null

  @column()
  declare cancelledById: number | null

  @column()
  declare offlineId: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare syncedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'ticketerId' })
  declare ticketer: BelongsTo<typeof User>

  @belongsTo(() => TripStop, { foreignKey: 'boardingStopId' })
  declare boardingStop: BelongsTo<typeof TripStop>

  @belongsTo(() => TripStop, { foreignKey: 'alightingStopId' })
  declare alightingStop: BelongsTo<typeof TripStop>

  @hasMany(() => BookingSeat)
  declare bookingSeats: HasMany<typeof BookingSeat>
}
