import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import City from '#models/city'
import RouteStop from '#models/route_stop'

export default class Route extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fromCityId: number

  @column()
  declare toCityId: number

  @column()
  declare distanceKm: number | null

  @column()
  declare estimatedDurationMin: number | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => City, { foreignKey: 'fromCityId' })
  declare fromCity: BelongsTo<typeof City>

  @belongsTo(() => City, { foreignKey: 'toCityId' })
  declare toCity: BelongsTo<typeof City>

  @hasMany(() => RouteStop)
  declare stops: HasMany<typeof RouteStop>
}
