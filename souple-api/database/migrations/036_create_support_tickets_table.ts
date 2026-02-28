import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'support_tickets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('reference', 20).notNullable().unique()
      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .bigInteger('booking_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('bookings')
        .onDelete('SET NULL')
      table
        .enum('category', ['booking', 'payment', 'delay', 'luggage', 'driver', 'refund', 'other'])
        .notNullable()
        .defaultTo('other')
      table
        .enum('priority', ['low', 'normal', 'high', 'urgent'])
        .notNullable()
        .defaultTo('normal')
      table
        .enum('status', ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'])
        .notNullable()
        .defaultTo('open')
      table.string('title', 255).notNullable()
      table.timestamp('resolved_at').nullable()
      table.tinyint('satisfaction_rating').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
      table.index(['organization_id'])
      table.index(['status'])
      table.index(['category'])
      table.index(['reference'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
