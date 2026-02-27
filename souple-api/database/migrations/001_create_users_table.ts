import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('email', 255).unique().nullable()
      table.string('phone', 20).unique().notNullable()
      table.string('password', 255).notNullable()
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('avatar_url', 500).nullable()
      table.string('locale', 5).defaultTo('fr').notNullable()
      table.string('timezone', 50).defaultTo('Africa/Lubumbashi').notNullable()
      table.boolean('is_super_admin').defaultTo(false).notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('email_verified_at').nullable()
      table.timestamp('phone_verified_at').nullable()
      table.string('remember_me_token', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['is_active'])
      table.index(['is_super_admin'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
