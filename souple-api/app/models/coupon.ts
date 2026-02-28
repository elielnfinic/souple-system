import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Promotion from '#models/promotion'

export default class Coupon extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare promotionId: number | null

  @column()
  declare code: string

  @column()
  declare usageLimit: number | null

  @column()
  declare currentUses: number

  @column()
  declare perUserLimit: number

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Promotion)
  declare promotion: BelongsTo<typeof Promotion>
}
