import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'corporate_accounts'

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
      table.string('name', 100).notNullable()
      table.string('registration_number', 50).nullable()
      table.string('billing_email', 255).notNullable()
      table.decimal('credit_limit_cdf', 12, 2).notNullable().defaultTo(0)
      table.decimal('current_balance_cdf', 12, 2).notNullable().defaultTo(0)
      table.enum('status', ['pending', 'active', 'suspended']).notNullable().defaultTo('pending')
      table.decimal('monthly_budget_cdf', 12, 2).nullable()
      table.timestamp('approved_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
