import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .bigInteger('subscription_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('subscriptions')
        .onDelete('SET NULL')
      table.string('reference', 30).unique().notNullable()
      table
        .enum('status', ['draft', 'open', 'paid', 'void', 'uncollectible'])
        .defaultTo('draft')
        .notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).defaultTo('USD').notNullable()
      table.json('line_items').notNullable() // [{description: string, amount: number, quantity: number}]
      table.date('due_date').notNullable()
      table.timestamp('paid_at').nullable()
      table.date('period_start').nullable()
      table.date('period_end').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['subscription_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
