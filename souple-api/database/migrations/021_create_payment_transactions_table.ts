import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payment_transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('payment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payments')
        .onDelete('CASCADE')
      table.enu('type', ['charge', 'refund', 'payout']).notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).notNullable()
      table.enu('status', ['pending', 'success', 'failed']).notNullable()
      table.string('provider_reference', 255).nullable()
      table.json('raw_response').nullable()
      table.text('error_message').nullable()
      table.timestamp('created_at').notNullable()
      // No updated_at — these records are immutable audit entries

      // Indexes
      table.index(['payment_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
