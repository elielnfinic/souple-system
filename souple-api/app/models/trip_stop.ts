import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Trip from '#models/trip'
import City from '#models/city'

export default class TripStop extends BaseModel {
  static table = 'trip_stops'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tripId: number

  @column()
  declare cityId: number

  @column()
  declare stopOrder: number

  @column()
  declare stopName: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare scheduledArrivalAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare scheduledDepartureAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare actualArrivalAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare actualDepartureAt: DateTime | null

  @column()
  declare distanceFromStartKm: number

  @column()
  declare boardingEnabled: boolean

  @column()
  declare alightingEnabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => City)
  declare city: BelongsTo<typeof City>
}
