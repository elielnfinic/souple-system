import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payment from '#models/payment'
import Booking from '#models/booking'
import User from '#models/user'

export type RefundStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export default class Refund extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare paymentId: number

  @column()
  declare bookingId: number | null

  @column()
  declare reference: string

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare reason: string | null

  @column()
  declare status: RefundStatus

  @column()
  declare providerRefundId: string | null

  @column()
  declare processedByUserId: number | null

  @column.dateTime()
  declare processedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => User, { foreignKey: 'processedByUserId' })
  declare processedBy: BelongsTo<typeof User>
}
