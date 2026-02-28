import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trip_seats'

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
      table.string('seat_identifier', 10).notNullable() // e.g. 'A1', 'B3'
      table.string('seat_class', 50).notNullable()
      table.decimal('full_trip_price', 12, 2).notNullable() // Price for the entire route (reference)
      table.string('currency', 3).defaultTo('CDF').notNullable()
      table.boolean('is_blocked').defaultTo(false).notNullable() // Permanently blocked (broken seat, etc.)
      table.json('features').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // NOTE: No status column — availability is computed dynamically via booking_seats overlap check

      // Indexes
      table.unique(['trip_id', 'seat_identifier'])
      table.index(['trip_id', 'is_blocked'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
