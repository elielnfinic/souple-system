import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import RouteStop from '#models/route_stop'

export default class City extends BaseModel {
  static table = 'cities'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare province: string

  @column()
  declare country: string

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column()
  declare timezone: string

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @hasMany(() => RouteStop)
  declare routeStops: HasMany<typeof RouteStop>
}
