import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { OrgType, OrgSettings } from '@souple/shared'
import OrganizationMember from '#models/organization_member'
import User from '#models/user'

export default class Organization extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare type: OrgType

  @column()
  declare logoUrl: string | null

  @column()
  declare address: string | null

  @column()
  declare city: string

  @column()
  declare country: string

  @column()
  declare phone: string

  @column()
  declare email: string

  @column()
  declare taxId: string | null

  @column()
  declare requiredKycLevel: 0 | 1 | 2

  @column()
  declare isPublic: boolean

  @column()
  declare isActive: boolean

  @column({
    prepare: (value: OrgSettings | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare settings: OrgSettings | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Relations ───────────────────────────────────────────────────────────

  @hasMany(() => OrganizationMember)
  declare members: HasMany<typeof OrganizationMember>

  @manyToMany(() => User, {
    through: () => OrganizationMember,
    pivotForeignKey: 'organization_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['role', 'is_active', 'joined_at'],
  })
  declare users: ManyToMany<typeof User>
}
