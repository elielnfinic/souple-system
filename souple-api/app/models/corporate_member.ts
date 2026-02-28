import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CorporateAccount from '#models/corporate_account'
import User from '#models/user'

export default class CorporateMember extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare corporateAccountId: number

  @column()
  declare userId: number

  @column()
  declare role: 'admin' | 'booker' | 'traveler'

  @column()
  declare monthlyLimitCdf: number | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => CorporateAccount)
  declare corporateAccount: BelongsTo<typeof CorporateAccount>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
