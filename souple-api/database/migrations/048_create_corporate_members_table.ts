import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'corporate_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('corporate_account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('corporate_accounts')
        .onDelete('CASCADE')
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('role', ['admin', 'booker', 'traveler']).notNullable().defaultTo('traveler')
      table.decimal('monthly_limit_cdf', 12, 2).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['corporate_account_id', 'user_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
