import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('title', 255).notNullable()
      table.text('body').notNullable()
      table.enum('channel', ['in_app', 'sms', 'email', 'push', 'telegram']).notNullable()
      table.string('type', 50).notNullable()
      table
        .enum('status', ['pending', 'sent', 'delivered', 'failed', 'read'])
        .defaultTo('pending')
        .notNullable()
      table.json('data').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('sent_at').nullable()
      table.text('failed_reason').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
      table.index(['channel'])
      table.index(['status'])
      table.index(['type'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
