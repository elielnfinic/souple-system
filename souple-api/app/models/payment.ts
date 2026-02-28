import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import FleetBooking from '#models/fleet_booking'
import Organization from '#models/organization'
import User from '#models/user'

export type PaymentMethod = 'mobile_money' | 'card' | 'stripe' | 'stablecoin' | 'cash'
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'

export default class Payment extends BaseModel {
  static table = 'payments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingId: number | null

  @column()
  declare fleetBookingId: number | null

  @column()
  declare organizationId: number | null

  @column()
  declare userId: number | null

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare method: PaymentMethod

  @column()
  declare provider: string | null

  @column()
  declare status: PaymentStatus

  @column()
  declare externalTransactionId: string | null

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare providerResponse: any

  @column()
  declare phoneNumber: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare refundedAt: DateTime | null

  @column()
  declare refundAmount: number | null

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare metadata: any

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => FleetBooking)
  declare fleetBooking: BelongsTo<typeof FleetBooking>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
