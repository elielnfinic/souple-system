import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'refunds'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('payment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payments')
        .onDelete('RESTRICT')
      table
        .bigInteger('booking_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('bookings')
        .onDelete('SET NULL')
      table.string('reference', 30).unique().notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).notNullable()
      table.text('reason').nullable()
      table
        .enum('status', ['pending', 'processing', 'succeeded', 'failed'])
        .defaultTo('pending')
        .notNullable()
      table.string('provider_refund_id', 100).nullable()
      table
        .bigInteger('processed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('processed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['payment_id'])
      table.index(['booking_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
