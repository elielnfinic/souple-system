import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'

export default class VehicleDocument extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare vehicleId: number

  @column()
  declare type: 'insurance' | 'technical_visit' | 'registration' | 'permit' | 'other'

  @column()
  declare documentNumber: string | null

  @column()
  declare fileUrl: string

  @column()
  declare fileKey: string | null

  @column()
  declare issuedDate: string | null

  @column()
  declare expiryDate: string | null

  @column()
  declare status: 'valid' | 'expiring_soon' | 'expired' | 'pending_renewal'

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
