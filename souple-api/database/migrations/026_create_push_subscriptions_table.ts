import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'push_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('endpoint').notNullable()
      table.string('p256dh_key', 255).notNullable()
      table.string('auth_key', 255).notNullable()
      table.string('user_agent', 255).nullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index for fast lookup of all subscriptions for a user
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
