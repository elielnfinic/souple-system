import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'coupons'

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
        .bigInteger('promotion_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('promotions')
        .onDelete('SET NULL')
      table.string('code', 30).unique().notNullable()
      table.integer('usage_limit').nullable()
      table.integer('current_uses').defaultTo(0)
      table.integer('per_user_limit').defaultTo(1)
      table.timestamp('expires_at').nullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['code'])
      table.index(['organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
