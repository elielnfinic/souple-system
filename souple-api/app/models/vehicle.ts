import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'
import SeatLayout from '#models/seat_layout'

export type VehicleVisibility = 'public' | 'private'
export type VehicleVerificationStatus = 'pending' | 'verified' | 'rejected'

export interface VehiclePhoto {
  url: string
  key: string
  isPrimary: boolean
}

export default class Vehicle extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare ownerUserId: number

  @column()
  declare type: string

  @column()
  declare brand: string

  @column()
  declare model: string

  @column()
  declare year: number | null

  @column()
  declare color: string

  @column()
  declare plateNumber: string

  @column()
  declare chassisNumber: string | null

  @column()
  declare totalSeats: number

  @column()
  declare visibility: VehicleVisibility

  @column()
  declare isAvailableForRental: boolean

  @column()
  declare verificationStatus: VehicleVerificationStatus

  @column()
  declare isActive: boolean

  @column()
  declare rating: number

  @column()
  declare totalTrips: number

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare features: string[] | null

  @column({
    prepare: (value: VehiclePhoto[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare photos: VehiclePhoto[] | null

  @column.date()
  declare insuranceExpiry: DateTime | null

  @column.date()
  declare technicalVisitExpiry: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'ownerUserId' })
  declare owner: BelongsTo<typeof User>

  @hasMany(() => SeatLayout)
  declare seatLayouts: HasMany<typeof SeatLayout>
}
