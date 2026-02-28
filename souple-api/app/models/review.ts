import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import User from '#models/user'
import Organization from '#models/organization'
import Vehicle from '#models/vehicle'

export default class Review extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingId: number

  @column()
  declare reviewerUserId: number

  @column()
  declare organizationId: number | null

  @column()
  declare vehicleId: number | null

  @column()
  declare driverUserId: number | null

  @column()
  declare overallRating: number

  @column()
  declare comfortRating: number | null

  @column()
  declare punctualityRating: number | null

  @column()
  declare driverRating: number | null

  @column()
  declare comment: string | null

  @column()
  declare isPublic: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => User, { foreignKey: 'reviewerUserId' })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
