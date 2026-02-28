import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seat_reservations'

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
        .bigInteger('trip_seat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trip_seats')
        .onDelete('CASCADE')
      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.smallint('boarding_stop_order').notNullable()
      table.smallint('alighting_stop_order').notNullable()
      table.timestamp('reserved_until').notNullable() // 5-minute temporary hold expiry
      table.timestamp('created_at').notNullable()

      // Indexes (explicit names keep them under MySQL's 64-char limit)
      table.index(['trip_seat_id', 'boarding_stop_order', 'alighting_stop_order'], 'sr_seat_boarding_alighting_idx')
      table.index(['reserved_until'], 'sr_reserved_until_idx')
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
