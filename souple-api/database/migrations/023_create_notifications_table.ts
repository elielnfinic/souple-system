import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

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
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .enu('channel', ['email', 'sms', 'telegram', 'push'])
        .notNullable()
      table.string('type', 100).notNullable() // 'booking_confirmed', 'payment_receipt', etc.
      table.string('title', 255).notNullable()
      table.text('body').notNullable()
      table.json('data').nullable()
      table
        .enu('status', ['pending', 'queued', 'sent', 'delivered', 'failed'])
        .defaultTo('pending')
        .notNullable()
      table.text('error_message').nullable()
      table.string('external_id', 255).nullable() // Provider message ID
      table.timestamp('sent_at').nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['user_id', 'read_at'])      // composite: unread count queries
      table.index(['user_id', 'type'])          // composite: filter by type per user
      table.index(['status'])                   // queue worker polling
      table.index(['organization_id', 'created_at']) // composite: org-scoped admin queries
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
