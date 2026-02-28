import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Agent from '#models/agent'
import Organization from '#models/organization'

export default class AgentAgreement extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agentId: number

  @column()
  declare organizationId: number

  @column()
  declare commissionRate: number

  @column()
  declare status: 'pending' | 'active' | 'suspended' | 'terminated'

  @column.dateTime()
  declare startsAt: DateTime

  @column.dateTime()
  declare endsAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Agent)
  declare agent: BelongsTo<typeof Agent>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
