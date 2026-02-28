import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SupportTicket from '#models/support_ticket'
import User from '#models/user'

export default class TicketMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ticketId: number

  @column()
  declare senderUserId: number | null

  @column()
  declare isInternalNote: boolean

  @column()
  declare content: string

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare attachments: any[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => SupportTicket)
  declare ticket: BelongsTo<typeof SupportTicket>

  @belongsTo(() => User, { foreignKey: 'senderUserId' })
  declare sender: BelongsTo<typeof User>
}
