import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'

export default class MaintenanceRecord extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare vehicleId: number

  @column()
  declare type:
    | 'oil_change'
    | 'tire_rotation'
    | 'brake_service'
    | 'engine'
    | 'transmission'
    | 'inspection'
    | 'repair'
    | 'other'

  @column()
  declare performedBy: string | null

  @column()
  declare performedAt: string

  @column()
  declare odometerKm: number | null

  @column()
  declare costCdf: number | null

  @column()
  declare description: string

  @column()
  declare nextServiceKm: number | null

  @column()
  declare nextServiceDate: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
