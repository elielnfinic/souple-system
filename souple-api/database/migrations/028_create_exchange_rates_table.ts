import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exchange_rates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('from_currency', 3).notNullable()
      table.string('to_currency', 3).notNullable()
      table.decimal('rate', 12, 4).notNullable()
      table.enum('source', ['manual', 'api', 'locked']).defaultTo('manual').notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('valid_from').notNullable()
      table.timestamp('valid_until').nullable()
      table
        .bigInteger('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['from_currency', 'to_currency'])
      table.index(['is_active'])
      table.index(['valid_from'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
