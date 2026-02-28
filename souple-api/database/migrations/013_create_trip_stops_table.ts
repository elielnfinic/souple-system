import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trip_stops'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('trip_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trips')
        .onDelete('CASCADE')
      table
        .bigInteger('city_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('cities')
        .onDelete('RESTRICT')
      table.tinyint('stop_order').unsigned().notNullable()
      table.decimal('distance_from_start_km', 8, 2).nullable()
      table.integer('duration_from_start_min').unsigned().nullable()
      table.timestamp('scheduled_arrival_at').nullable()
      table.timestamp('scheduled_departure_at').nullable()
      table.timestamp('actual_arrival_at').nullable()
      table.timestamp('actual_departure_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['trip_id', 'stop_order'])
      table.index(['trip_id'])
      table.index(['city_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
