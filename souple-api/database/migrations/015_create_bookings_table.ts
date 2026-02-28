import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('reference', 20).unique().notNullable()
      table
        .bigInteger('trip_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trips')
        .onDelete('RESTRICT')
      table
        .bigInteger('passenger_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .bigInteger('boarding_stop_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trip_stops')
        .onDelete('RESTRICT')
      table
        .bigInteger('alighting_stop_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trip_stops')
        .onDelete('RESTRICT')
      table.tinyint('boarding_stop_order').unsigned().notNullable()
      table.tinyint('alighting_stop_order').unsigned().notNullable()
      table.string('passenger_name', 100).notNullable()
      table.string('passenger_phone', 20).nullable()
      table
        .enum('status', ['pending', 'confirmed', 'boarded', 'completed', 'cancelled', 'no_show'])
        .defaultTo('pending')
        .notNullable()
      table.decimal('total_amount_cdf', 12, 2).notNullable()
      table.decimal('total_amount_usd', 8, 2).nullable()
      table.string('currency', 3).defaultTo('CDF').notNullable()
      table
        .enum('payment_status', ['unpaid', 'partial', 'paid', 'refunded'])
        .defaultTo('unpaid')
        .notNullable()
      table.text('qr_code').nullable()
      table
        .bigInteger('booked_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('notes').nullable()
      table.timestamp('cancelled_at').nullable()
      table.text('cancellation_reason').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['trip_id'])
      table.index(['passenger_user_id'])
      table.index(['status'])
      table.index(['payment_status'])
      table.index(['reference'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
