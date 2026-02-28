import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Trip from '#models/trip'

export default class Incident extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reporterUserId: number | null

  @column()
  declare tripId: number | null

  @column()
  declare type: 'accident' | 'breakdown' | 'crime' | 'harassment' | 'medical' | 'other'

  @column()
  declare description: string

  @column()
  declare locationLat: number | null

  @column()
  declare locationLng: number | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare photos: string[] | null

  @column()
  declare status: 'reported' | 'investigating' | 'resolved' | 'dismissed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User, { foreignKey: 'reporterUserId' })
  declare reporter: BelongsTo<typeof User>

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>
}
