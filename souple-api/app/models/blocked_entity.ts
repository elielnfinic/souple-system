import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class BlockedEntity extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare entityType: 'phone' | 'email' | 'ip' | 'device_fingerprint'

  @column()
  declare entityValue: string

  @column()
  declare reason: string

  @column()
  declare blockedByUserId: number | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User, { foreignKey: 'blockedByUserId' })
  declare blockedBy: BelongsTo<typeof User>
}
