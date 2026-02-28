import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired'
export type BillingCycle = 'monthly' | 'annual'

export default class Subscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare tier: SubscriptionTier

  @column()
  declare status: SubscriptionStatus

  @column()
  declare billingCycle: BillingCycle

  @column.dateTime()
  declare currentPeriodStart: DateTime | null

  @column.dateTime()
  declare currentPeriodEnd: DateTime | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column.dateTime()
  declare trialEndsAt: DateTime | null

  @column()
  declare maxVehicles: number

  @column()
  declare maxTripsPerMonth: number

  @column()
  declare maxUsers: number

  @column()
  declare commissionRate: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
