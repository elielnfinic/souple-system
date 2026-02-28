import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('booking_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('bookings')
        .onDelete('SET NULL')
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('reference', 50).unique().notNullable()
      table.string('internal_reference', 30).unique().notNullable()
      table
        .enum('provider', ['mtn_momo', 'orange_money', 'airtel_money', 'stripe', 'cash', 'usdt', 'usdc'])
        .notNullable()
      table.enum('method', ['mobile_money', 'card', 'cash', 'crypto']).notNullable()
      table
        .enum('status', ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'])
        .defaultTo('pending')
        .notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).notNullable()
      table.decimal('amount_usd', 8, 2).nullable()
      table.decimal('exchange_rate', 10, 4).nullable()
      table.decimal('fee_amount', 8, 2).nullable()
      table.decimal('net_amount', 12, 2).nullable()
      table.string('phone_number', 20).nullable()
      table.string('card_last4', 4).nullable()
      table.string('provider_transaction_id', 100).nullable()
      table.json('provider_metadata').nullable()
      table.text('failure_reason').nullable()
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['booking_id'])
      table.index(['user_id'])
      table.index(['status'])
      table.index(['provider'])
      table.index(['reference'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
