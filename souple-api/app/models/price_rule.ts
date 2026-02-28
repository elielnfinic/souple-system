import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Route from '#models/route'

export type PriceMode = 'fixed' | 'per_segment' | 'per_km'

export default class PriceRule extends BaseModel {
  static table = 'price_rules'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare routeId: number

  @column()
  declare fromStopOrder: number | null

  @column()
  declare toStopOrder: number | null

  @column()
  declare seatClassId: number | null

  @column()
  declare vehicleId: number | null

  @column()
  declare basePrice: number

  @column()
  declare currency: string

  @column()
  declare priceMode: PriceMode

  @column()
  declare perSegmentPrice: number | null

  @column()
  declare perKmPrice: number | null

  @column.date({ autoCreate: false, autoUpdate: false })
  declare effectiveFrom: DateTime

  @column.date({ autoCreate: false, autoUpdate: false })
  declare effectiveUntil: DateTime | null

  @column()
  declare isPeak: boolean

  @column()
  declare peakMultiplier: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>
}
