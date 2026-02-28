import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payment from '#models/payment'

export type AttemptStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export default class PaymentAttempt extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare paymentId: number

  @column()
  declare attemptNumber: number

  @column()
  declare status: AttemptStatus

  @column()
  declare errorCode: string | null

  @column()
  declare errorMessage: string | null

  @column({
    prepare: (v) => JSON.stringify(v),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare providerResponse: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>
}
