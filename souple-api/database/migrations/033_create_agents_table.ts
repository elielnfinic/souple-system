import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('kyc_status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending')
      table.string('business_name', 100).nullable()
      table.string('payout_method', 50).nullable()
      table.string('payout_number', 20).nullable()
      table.decimal('balance_cdf', 12, 2).notNullable().defaultTo(0)
      table.decimal('total_earned_cdf', 12, 2).notNullable().defaultTo(0)
      table.decimal('total_paid_out_cdf', 12, 2).notNullable().defaultTo(0)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
      table.index(['kyc_status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
