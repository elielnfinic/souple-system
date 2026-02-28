import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payment from '#models/payment'

export type TransactionType = 'charge' | 'refund' | 'payout'
export type TransactionStatus = 'pending' | 'success' | 'failed'

export default class PaymentTransaction extends BaseModel {
  static table = 'payment_transactions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare paymentId: number

  @column()
  declare type: TransactionType

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare status: TransactionStatus

  @column()
  declare providerReference: string | null

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare rawResponse: any

  @column()
  declare errorMessage: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // No updatedAt — payment_transactions are immutable audit entries

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>
}
