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
        .bigInteger('fleet_booking_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('fleet_bookings')
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
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).defaultTo('CDF').notNullable()
      table
        .enu('method', ['mobile_money', 'card', 'stripe', 'stablecoin', 'cash'])
        .notNullable()
      table.string('provider', 50).nullable() // 'mtn', 'orange', 'airtel', 'stripe', 'usdt', 'usdc'
      table
        .enu('status', ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'])
        .defaultTo('pending')
        .notNullable()
      table.string('external_transaction_id', 255).nullable()
      table.json('provider_response').nullable()
      table.string('phone_number', 20).nullable() // For mobile money
      table.timestamp('paid_at').nullable()
      table.timestamp('refunded_at').nullable()
      table.decimal('refund_amount', 12, 2).nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['booking_id'])
      table.index(['fleet_booking_id'])
      table.index(['status'])
      table.index(['external_transaction_id'])
      table.index(['organization_id', 'created_at']) // composite for org-scoped finance queries
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
