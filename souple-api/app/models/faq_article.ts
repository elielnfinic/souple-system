import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class FaqArticle extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare category: string

  @column()
  declare titleFr: string

  @column()
  declare titleEn: string | null

  @column()
  declare bodyFr: string

  @column()
  declare bodyEn: string | null

  @column()
  declare isPublished: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
