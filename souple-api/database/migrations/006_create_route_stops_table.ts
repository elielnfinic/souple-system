import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'route_stops'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('route_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('routes')
        .onDelete('CASCADE')
      table
        .bigInteger('city_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('cities')
        .onDelete('RESTRICT')
      table.smallint('stop_order').notNullable()
      table.decimal('distance_from_start_km', 8, 2).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['route_id', 'stop_order'])
      table.index(['city_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
