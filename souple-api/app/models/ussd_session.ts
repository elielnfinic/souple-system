import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class UssdSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare sessionId: string

  @column()
  declare phone: string

  @column()
  declare step: string

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare data: Record<string, any> | null

  @column()
  declare language: 'fr' | 'en' | 'ln' | 'sw'

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
