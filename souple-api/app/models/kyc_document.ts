import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export type KycDocumentType = 'national_id' | 'passport' | 'drivers_license' | 'business_license' | 'vehicle_registration'
export type KycDocumentStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired'

export default class KycDocument extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare type: KycDocumentType

  @column()
  declare status: KycDocumentStatus

  @column()
  declare fileUrl: string

  @column()
  declare fileKey: string | null

  @column.date()
  declare expiryDate: DateTime | null

  @column()
  declare documentNumber: string | null

  @column()
  declare verifiedByUserId: number | null

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column()
  declare rejectionReason: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'verifiedByUserId' })
  declare verifier: BelongsTo<typeof User>
}
