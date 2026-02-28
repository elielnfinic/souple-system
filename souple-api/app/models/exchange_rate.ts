import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export type ExchangeRateSource = 'manual' | 'api' | 'locked'

export default class ExchangeRate extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fromCurrency: string

  @column()
  declare toCurrency: string

  @column()
  declare rate: number

  @column()
  declare source: ExchangeRateSource

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare validFrom: DateTime

  @column.dateTime()
  declare validUntil: DateTime | null

  @column()
  declare createdByUserId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare creator: BelongsTo<typeof User>
}
