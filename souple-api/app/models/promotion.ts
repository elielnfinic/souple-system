import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

export type PromotionType = 'percentage' | 'fixed_amount' | 'free_seat'

export default class Promotion extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number | null

  @column()
  declare name: string

  @column()
  declare type: PromotionType

  @column()
  declare discountValue: number

  @column()
  declare maxUses: number | null

  @column()
  declare currentUses: number

  @column()
  declare minAmountCdf: number | null

  @column({
    prepare: (v) => (v ? JSON.stringify(v) : null),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare applicableRoutes: number[] | null

  @column.dateTime()
  declare validFrom: DateTime

  @column.dateTime()
  declare validUntil: DateTime | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
