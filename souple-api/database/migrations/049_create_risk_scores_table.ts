import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'risk_scores'

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
      table.decimal('score', 4, 2).notNullable().defaultTo(0)
      table.enum('level', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('low')
      table.json('reasons').nullable()
      table.timestamp('last_updated_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
      table.index(['level'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
