import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Vehicle from '#models/vehicle'
import User from '#models/user'

export type FleetBookingType = 'event' | 'moving' | 'day_rental' | 'pickup' | 'custom'
export type FleetBookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export default class FleetBooking extends BaseModel {
  static table = 'fleet_bookings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingCode: string

  @column()
  declare organizationId: number | null

  @column()
  declare vehicleId: number

  @column()
  declare userId: number

  @column()
  declare driverUserId: number | null

  @column()
  declare type: FleetBookingType

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare startAt: DateTime

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare endAt: DateTime

  @column()
  declare pickupLocation: string

  @column()
  declare pickupLatitude: number | null

  @column()
  declare pickupLongitude: number | null

  @column()
  declare dropoffLocation: string | null

  @column()
  declare dropoffLatitude: number | null

  @column()
  declare dropoffLongitude: number | null

  @column()
  declare totalAmount: number

  @column()
  declare currency: string

  @column()
  declare status: FleetBookingStatus

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

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'driverUserId' })
  declare driver: BelongsTo<typeof User>
}
