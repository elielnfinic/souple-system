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
        .onDelete('RESTRICT')
      table.string('seat_id', 10).notNullable()
      table.string('seat_class', 20).nullable()
      table.decimal('price_cdf', 12, 2).notNullable()
      table.decimal('price_usd', 8, 2).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['booking_id', 'trip_seat_id'])
      table.index(['booking_id'])
      table.index(['trip_seat_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
