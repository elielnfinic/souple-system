import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'

export default class Conversation extends BaseModel {
  @column({ isPrimary: true }) declare id: number
  @column() declare bookingId: number | null
  @column() declare tripId: number | null
  @column() declare type: 'passenger_agency' | 'passenger_driver' | 'internal'
  @column() declare participantAId: number
  @column() declare participantBId: number | null
  @column() declare participantBOrgId: number | null
  @column() declare status: 'active' | 'archived' | 'blocked'
  @column.dateTime() declare lastMessageAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'participantAId' }) declare participantA: BelongsTo<typeof User>
  @belongsTo(() => User, { foreignKey: 'participantBId' }) declare participantB: BelongsTo<typeof User>
  @belongsTo(() => Organization, { foreignKey: 'participantBOrgId' }) declare participantBOrg: BelongsTo<typeof Organization>
  @hasMany(() => Message) declare messages: HasMany<typeof Message>
}

// Import after to avoid circular
import Message from '#models/message'
