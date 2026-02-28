import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.string('key_hash', 255).notNullable()
      table.string('key_prefix', 10).notNullable()
      table.json('scopes').notNullable()
      table.integer('rate_limit_per_minute').defaultTo(60)
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table
        .bigInteger('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['key_prefix'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
