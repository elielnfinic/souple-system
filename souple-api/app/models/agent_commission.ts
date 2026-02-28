import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Agent from '#models/agent'
import AgentAgreement from '#models/agent_agreement'
import Booking from '#models/booking'

export default class AgentCommission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agentId: number

  @column()
  declare agreementId: number

  @column()
  declare bookingId: number

  @column()
  declare amountCdf: number

  @column()
  declare rate: number

  @column()
  declare status: 'pending' | 'confirmed' | 'paid' | 'reversed'

  @column.dateTime()
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Agent)
  declare agent: BelongsTo<typeof Agent>

  @belongsTo(() => AgentAgreement)
  declare agreement: BelongsTo<typeof AgentAgreement>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>
}
