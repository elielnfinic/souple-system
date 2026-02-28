import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'

export type SeatType = 'driver' | 'seat' | 'aisle' | 'door' | 'luggage' | 'empty'
export type SeatClassSlug = 'vip' | 'economy' | 'business'

export interface SeatDefinition {
  id: string
  row: number
  col: number
  type: SeatType
  class: SeatClassSlug | null
  bookable: boolean
  label: string | null
  priceMultiplier: number
  features: string[]
}

export interface LayoutData {
  seats: SeatDefinition[]
}

export default class SeatLayout extends BaseModel {
  static table = 'seat_layouts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare vehicleId: number

  @column()
  declare name: string

  @column()
  declare rows: number

  @column()
  declare columns: number

  @column({
    prepare: (value: LayoutData | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare layoutData: LayoutData

  @column()
  declare isDefault: boolean

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
