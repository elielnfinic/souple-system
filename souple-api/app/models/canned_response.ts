import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

export default class CannedResponse extends BaseModel {
  @column({ isPrimary: true }) declare id: number
  @column() declare organizationId: number | null
  @column() declare category: string
  @column({
    prepare: (v: any) => (typeof v === 'string' ? v : JSON.stringify(v)),
    consume: (v: any) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare text: Record<string, string>
  @column() declare sortOrder: number
  @column() declare isActive: boolean
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => Organization) declare organization: BelongsTo<typeof Organization>
}
