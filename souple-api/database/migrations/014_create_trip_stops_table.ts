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
      table.smallint('stop_order').notNullable() // 0 = origin, 1 = first stop, ..., N = final destination
      table.string('stop_name', 200).nullable() // Optional: specific terminal/station name
      table.dateTime('scheduled_arrival_at').nullable() // NULL for first stop (origin)
      table.dateTime('scheduled_departure_at').nullable() // NULL for last stop (destination)
      table.dateTime('actual_arrival_at').nullable()
      table.dateTime('actual_departure_at').nullable()
      table.decimal('distance_from_start_km', 8, 2).defaultTo(0).notNullable()
      table.boolean('boarding_enabled').defaultTo(true).notNullable() // Can passengers board here?
      table.boolean('alighting_enabled').defaultTo(true).notNullable() // Can passengers alight here?
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.unique(['trip_id', 'stop_order'])
      table.index(['trip_id', 'city_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
