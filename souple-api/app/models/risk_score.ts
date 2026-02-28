import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class RiskScore extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare score: number

  @column()
  declare level: 'low' | 'medium' | 'high' | 'critical'

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare reasons: string[] | null

  @column.dateTime()
  declare lastUpdatedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
