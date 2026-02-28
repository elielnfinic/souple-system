import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Trip from '#models/trip'
import City from '#models/city'

export type ParcelStatus = 'pending' | 'accepted' | 'in_transit' | 'arrived' | 'delivered' | 'returned' | 'lost'

export default class Parcel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare tripId: number | null

  @column()
  declare trackingCode: string

  @column()
  declare senderName: string

  @column()
  declare senderPhone: string

  @column()
  declare receiverName: string

  @column()
  declare receiverPhone: string

  @column()
  declare originCityId: number

  @column()
  declare destinationCityId: number

  @column()
  declare description: string | null

  @column()
  declare weightKg: number | null

  @column()
  declare fragile: boolean

  @column()
  declare declaredValueCdf: number | null

  @column()
  declare priceCdf: number | null

  @column()
  declare status: ParcelStatus

  @column.dateTime()
  declare pickupAt: DateTime | null

  @column.dateTime()
  declare deliveredAt: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => City, { foreignKey: 'originCityId' })
  declare originCity: BelongsTo<typeof City>

  @belongsTo(() => City, { foreignKey: 'destinationCityId' })
  declare destinationCity: BelongsTo<typeof City>
}
