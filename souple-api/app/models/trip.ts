import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Vehicle from '#models/vehicle'
import User from '#models/user'
import Route from '#models/route'
import SeatLayout from '#models/seat_layout'

export type TripStatus = 'scheduled' | 'boarding' | 'in_progress' | 'completed' | 'cancelled'

export default class Trip extends BaseModel {
  static table = 'trips'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare vehicleId: number

  @column()
  declare driverUserId: number

  @column()
  declare routeId: number

  @column()
  declare seatLayoutId: number

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare departureAt: DateTime

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare estimatedArrivalAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare actualDepartureAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare actualArrivalAt: DateTime | null

  @column()
  declare totalSeats: number

  @column()
  declare status: TripStatus

  @column()
  declare notes: string | null

  @column()
  declare isRecurring: boolean

  @column()
  declare recurrenceRule: string | null

  @column()
  declare allowIntermediateBoarding: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => User, { foreignKey: 'driverUserId' })
  declare driver: BelongsTo<typeof User>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>

  @belongsTo(() => SeatLayout)
  declare seatLayout: BelongsTo<typeof SeatLayout>
}
