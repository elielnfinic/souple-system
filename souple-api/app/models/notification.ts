import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'

export type NotificationChannel = 'email' | 'sms' | 'telegram' | 'push'
export type NotificationStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed'

export type NotificationType =
  | 'booking_confirmed'
  | 'payment_receipt'
  | 'trip_departure_reminder'
  | 'trip_cancelled'
  | 'trip_started'
  | 'trip_completed'
  | 'parcel_status_update'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'welcome'
  | 'otp_code'
  | 'fleet_booking_confirmed'
  | 'payout_processed'
  | string // Allow custom types

export default class Notification extends BaseModel {
  static table = 'notifications'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare organizationId: number | null

  @column()
  declare channel: NotificationChannel

  @column()
  declare type: string

  @column()
  declare title: string

  @column()
  declare body: string

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare data: Record<string, any> | null

  @column()
  declare status: NotificationStatus

  @column()
  declare errorMessage: string | null

  @column()
  declare externalId: string | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare sentAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare deliveredAt: DateTime | null

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
