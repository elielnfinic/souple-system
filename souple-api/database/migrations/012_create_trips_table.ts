import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

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
        .bigInteger('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('RESTRICT')
      table
        .bigInteger('route_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('routes')
        .onDelete('RESTRICT')
      table
        .bigInteger('driver_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('departure_at').notNullable()
      table
        .enum('status', ['scheduled', 'boarding', 'departed', 'completed', 'cancelled'])
        .defaultTo('scheduled')
        .notNullable()
      table.decimal('base_price_cdf', 12, 2).defaultTo(0).notNullable()
      table.decimal('base_price_usd', 8, 2).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['vehicle_id'])
      table.index(['route_id'])
      table.index(['driver_user_id'])
      table.index(['departure_at'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
