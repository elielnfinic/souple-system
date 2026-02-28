import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import CorporateMember from '#models/corporate_member'

export default class CorporateAccount extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare name: string

  @column()
  declare registrationNumber: string | null

  @column()
  declare billingEmail: string

  @column()
  declare creditLimitCdf: number

  @column()
  declare currentBalanceCdf: number

  @column()
  declare status: 'pending' | 'active' | 'suspended'

  @column()
  declare monthlyBudgetCdf: number | null

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => CorporateMember)
  declare members: HasMany<typeof CorporateMember>
}
