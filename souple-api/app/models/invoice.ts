import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Subscription from '#models/subscription'

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export interface InvoiceLineItem {
  description: string
  amount: number
  quantity: number
}

export default class Invoice extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare subscriptionId: number | null

  @column()
  declare reference: string

  @column()
  declare status: InvoiceStatus

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column({
    prepare: (v) => JSON.stringify(v),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare lineItems: InvoiceLineItem[]

  @column.date()
  declare dueDate: DateTime

  @column.dateTime()
  declare paidAt: DateTime | null

  @column.date()
  declare periodStart: DateTime | null

  @column.date()
  declare periodEnd: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Subscription)
  declare subscription: BelongsTo<typeof Subscription>
}
