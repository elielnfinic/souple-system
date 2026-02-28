import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'booking_seats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('booking_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table
        .bigInteger('trip_seat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trip_seats')
      table.string('passenger_name', 200).nullable() // For group bookings with different names
      table.timestamp('created_at').notNullable()
      // No updated_at — these are immutable records

      // Indexes
      table.index(['trip_seat_id'])
      table.index(['booking_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
