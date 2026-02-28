import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'promotions'

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
      table.enum('type', ['percentage', 'fixed_amount', 'free_seat']).notNullable()
      table.decimal('discount_value', 8, 2).notNullable()
      table.integer('max_uses').nullable()
      table.integer('current_uses').defaultTo(0)
      table.decimal('min_amount_cdf', 12, 2).nullable()
      table.json('applicable_routes').nullable()
      table.timestamp('valid_from').notNullable()
      table.timestamp('valid_until').nullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['is_active'])
      table.index(['valid_from', 'valid_until'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
