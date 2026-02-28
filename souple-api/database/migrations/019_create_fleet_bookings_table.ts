import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fleet_bookings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('booking_code', 20).unique().notNullable()
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
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
      table
        .bigInteger('driver_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .enu('type', ['event', 'moving', 'day_rental', 'pickup', 'custom'])
        .notNullable()
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.dateTime('start_at').notNullable()
      table.dateTime('end_at').notNullable()
      table.string('pickup_location', 500).notNullable()
      table.decimal('pickup_latitude', 10, 8).nullable()
      table.decimal('pickup_longitude', 11, 8).nullable()
      table.string('dropoff_location', 500).nullable()
      table.decimal('dropoff_latitude', 10, 8).nullable()
      table.decimal('dropoff_longitude', 11, 8).nullable()
      table.decimal('total_amount', 12, 2).notNullable()
      table.string('currency', 3).defaultTo('CDF').notNullable()
      table
        .enu('status', ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
        .defaultTo('pending')
        .notNullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['vehicle_id', 'start_at']) // composite for availability checks
      table.index(['user_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
