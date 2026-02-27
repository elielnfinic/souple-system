import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import City from '#models/city'
import Route from '#models/route'

export default class RouteStop extends BaseModel {
  static table = 'route_stops'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare routeId: number

  @column()
  declare cityId: number

  @column()
  declare stopOrder: number

  @column()
  declare distanceFromStartKm: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => City)
  declare city: BelongsTo<typeof City>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>
}
