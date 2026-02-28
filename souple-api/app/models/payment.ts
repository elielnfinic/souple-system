import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import User from '#models/user'
import PaymentAttempt from '#models/payment_attempt'
import Refund from '#models/refund'

export type PaymentProvider = 'mtn_momo' | 'orange_money' | 'airtel_money' | 'stripe' | 'cash' | 'usdt' | 'usdc'
export type PaymentMethod = 'mobile_money' | 'card' | 'cash' | 'crypto'
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'

export default class Payment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare bookingId: number | null

  @column()
  declare organizationId: number | null

  @column()
  declare userId: number | null

  @column()
  declare reference: string

  @column()
  declare internalReference: string

  @column()
  declare provider: PaymentProvider

  @column()
  declare method: PaymentMethod

  @column()
  declare status: PaymentStatus

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare amountUsd: number | null

  @column()
  declare exchangeRate: number | null

  @column()
  declare feeAmount: number | null

  @column()
  declare netAmount: number | null

  @column()
  declare phoneNumber: string | null

  @column()
  declare cardLast4: string | null

  @column()
  declare providerTransactionId: string | null

  @column({
    prepare: (v) => JSON.stringify(v),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare providerMetadata: Record<string, any> | null

  @column()
  declare failureReason: string | null

  @column.dateTime()
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => PaymentAttempt)
  declare attempts: HasMany<typeof PaymentAttempt>

  @hasOne(() => Refund)
  declare refund: HasOne<typeof Refund>
}
