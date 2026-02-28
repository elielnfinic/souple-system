import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payout_records'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
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
        .notNullable()
        .references('id')
        .inTable('users') // Driver or agency owner
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).notNullable()
      table.string('method', 50).notNullable()
      table.string('provider', 50).notNullable()
      table.string('phone_number', 20).nullable()
      table
        .enu('status', ['pending', 'processing', 'completed', 'failed'])
        .defaultTo('pending')
        .notNullable()
      table.string('external_reference', 255).nullable()
      table.date('period_start').notNullable()
      table.date('period_end').notNullable()
      table.text('notes').nullable()
      table.timestamp('processed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['organization_id', 'period_start']) // composite for org payout history
      table.index(['user_id', 'period_start']) // composite for driver/agent payout history
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
