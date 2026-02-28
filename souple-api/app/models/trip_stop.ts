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
  declare distanceFromStartKm: number | null

  @column()
  declare durationFromStartMin: number | null

  @column.dateTime()
  declare scheduledArrivalAt: DateTime | null

  @column.dateTime()
  declare scheduledDepartureAt: DateTime | null

  @column.dateTime()
  declare actualArrivalAt: DateTime | null

  @column.dateTime()
  declare actualDepartureAt: DateTime | null

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
