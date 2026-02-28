import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import AgentAgreement from '#models/agent_agreement'
import AgentCommission from '#models/agent_commission'

export default class Agent extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare kycStatus: 'pending' | 'approved' | 'rejected'

  @column()
  declare businessName: string | null

  @column()
  declare payoutMethod: string | null

  @column()
  declare payoutNumber: string | null

  @column()
  declare balanceCdf: number

  @column()
  declare totalEarnedCdf: number

  @column()
  declare totalPaidOutCdf: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => AgentAgreement)
  declare agreements: HasMany<typeof AgentAgreement>

  @hasMany(() => AgentCommission)
  declare commissions: HasMany<typeof AgentCommission>
}
