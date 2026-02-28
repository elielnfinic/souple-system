import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
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
        .bigInteger('driver_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
      table
        .bigInteger('route_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('routes')
      table
        .bigInteger('seat_layout_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('seat_layouts')
      table.dateTime('departure_at').notNullable() // Departure from FIRST stop
      table.dateTime('estimated_arrival_at').nullable() // Arrival at LAST stop
      table.dateTime('actual_departure_at').nullable()
      table.dateTime('actual_arrival_at').nullable()
      table.smallint('total_seats').notNullable()
      table
        .enu('status', ['scheduled', 'boarding', 'in_progress', 'completed', 'cancelled'])
        .defaultTo('scheduled')
        .notNullable()
      table.text('notes').nullable()
      table.boolean('is_recurring').defaultTo(false).notNullable()
      table.string('recurrence_rule', 255).nullable()
      table.boolean('allow_intermediate_boarding').defaultTo(true).notNullable() // Can passengers board/alight at intermediate stops?
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['departure_at'])
      table.index(['status'])
      table.index(['route_id', 'departure_at'])
      table.index(['organization_id', 'departure_at'])
      table.index(['driver_user_id', 'departure_at'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
