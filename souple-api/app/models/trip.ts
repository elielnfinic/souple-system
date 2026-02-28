import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Vehicle from '#models/vehicle'
import Route from '#models/route'
import User from '#models/user'
import TripStop from '#models/trip_stop'
import TripSeat from '#models/trip_seat'
import Booking from '#models/booking'

export type TripStatus = 'scheduled' | 'boarding' | 'departed' | 'completed' | 'cancelled'

export default class Trip extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare vehicleId: number

  @column()
  declare routeId: number

  @column()
  declare driverUserId: number | null

  @column.dateTime()
  declare departureAt: DateTime

  @column()
  declare status: TripStatus

  @column()
  declare basePriceCdf: number

  @column()
  declare basePriceUsd: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>

  @belongsTo(() => User, { foreignKey: 'driverUserId' })
  declare driver: BelongsTo<typeof User>

  @hasMany(() => TripStop)
  declare stops: HasMany<typeof TripStop>

  @hasMany(() => TripSeat)
  declare seats: HasMany<typeof TripSeat>

  @hasMany(() => Booking)
  declare bookings: HasMany<typeof Booking>
}
