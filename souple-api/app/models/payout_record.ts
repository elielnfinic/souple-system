import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export default class PayoutRecord extends BaseModel {
  static table = 'payout_records'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare userId: number

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare method: string

  @column()
  declare provider: string

  @column()
  declare phoneNumber: string | null

  @column()
  declare status: PayoutStatus

  @column()
  declare externalReference: string | null

  @column.date({ autoCreate: false, autoUpdate: false })
  declare periodStart: DateTime

  @column.date({ autoCreate: false, autoUpdate: false })
  declare periodEnd: DateTime

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare processedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
