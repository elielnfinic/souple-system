import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('booking_code', 20).unique().notNullable() // 'SP-XXXXXXXX'
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .bigInteger('trip_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trips')
      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL') // NULL for walk-in
      table
        .bigInteger('ticketer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.bigInteger('agent_id').unsigned().nullable() // No FK yet — agents table added in Skill 17
      table
        .enu('source', ['web', 'pos', 'ussd', 'whatsapp', 'agent', 'api', 'corporate'])
        .defaultTo('web')
        .notNullable()
      table
        .enu('type', ['individual', 'group'])
        .defaultTo('individual')
        .notNullable()
      table.string('passenger_name', 200).notNullable()
      table.string('passenger_phone', 20).notNullable()
      table.string('passenger_email', 255).nullable()
      table
        .bigInteger('boarding_stop_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trip_stops') // Where passenger boards
      table
        .bigInteger('alighting_stop_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trip_stops') // Where passenger alights
      table.smallint('boarding_stop_order').notNullable() // Denormalized for fast segment queries
      table.smallint('alighting_stop_order').notNullable() // Denormalized for fast segment queries
      table.smallint('seat_count').notNullable().defaultTo(1)
      table.decimal('total_amount', 12, 2).notNullable()
      table.string('currency', 3).defaultTo('CDF').notNullable()
      table
        .enu('status', ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'refunded'])
        .defaultTo('pending')
        .notNullable()
      table.string('qr_code_data', 500).nullable()
      table.timestamp('checked_in_at').nullable()
      table.timestamp('checked_out_at').nullable() // When passenger alights (for intermediate stops)
      table.text('cancellation_reason').nullable()
      table
        .bigInteger('cancelled_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('offline_id', 36).nullable()
      table.timestamp('synced_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['booking_code'])
      table.index(['trip_id', 'boarding_stop_order', 'alighting_stop_order']) // composite 3-column for overlap queries
      table.index(['user_id'])
      table.index(['passenger_phone'])
      table.index(['offline_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
