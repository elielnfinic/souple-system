import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, beforeSave, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { SupportedLocale } from '@souple/shared'
import OrganizationMember from '#models/organization_member'
import Organization from '#models/organization'

const AuthFinder = withAuthFinder(() => hash.use('bcrypt'), {
  uids: ['phone', 'email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '1 hour',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    abilities: ['*'],
  })

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string | null

  @column()
  declare phone: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare avatarUrl: string | null

  @column()
  declare locale: SupportedLocale

  @column()
  declare timezone: string

  @column()
  declare isSuperAdmin: boolean

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column.dateTime()
  declare phoneVerifiedAt: DateTime | null

  @column({ serializeAs: null })
  declare rememberMeToken: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ─── Computed ────────────────────────────────────────────────────────────

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  // ─── Relations ───────────────────────────────────────────────────────────

  @hasMany(() => OrganizationMember)
  declare memberships: HasMany<typeof OrganizationMember>

  @manyToMany(() => Organization, {
    through: () => OrganizationMember,
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'organization_id',
    pivotColumns: ['role', 'is_active', 'joined_at'],
  })
  declare organizations: ManyToMany<typeof Organization>

  // ─── Hooks ───────────────────────────────────────────────────────────────

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  // ─── Serialization ───────────────────────────────────────────────────────

  serialize() {
    return {
      id: this.id,
      email: this.email,
      phone: this.phone,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      locale: this.locale,
      timezone: this.timezone,
      isSuperAdmin: this.isSuperAdmin,
      isActive: this.isActive,
      emailVerifiedAt: this.emailVerifiedAt,
      phoneVerifiedAt: this.phoneVerifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
