import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Booking from '#models/booking'

export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment'

export default class LoyaltyPoint extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare bookingId: number | null

  @column()
  declare transactionType: LoyaltyTransactionType

  @column()
  declare points: number

  @column()
  declare balanceAfter: number

  @column()
  declare description: string | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>
}
