import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'price_rules'

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
        .bigInteger('route_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('routes')
        .onDelete('CASCADE')
      table.smallint('from_stop_order').nullable() // NULL = full route
      table.smallint('to_stop_order').nullable() // NULL = full route
      table
        .bigInteger('seat_class_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('seat_classes')
        .onDelete('SET NULL')
      table
        .bigInteger('vehicle_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('SET NULL')
      table.decimal('base_price', 12, 2).notNullable()
      table.string('currency', 3).defaultTo('CDF').notNullable()
      table
        .enu('price_mode', ['fixed', 'per_segment', 'per_km'])
        .defaultTo('fixed')
        .notNullable()
      table.decimal('per_segment_price', 12, 2).nullable() // Price per segment (if mode = per_segment)
      table.decimal('per_km_price', 12, 4).nullable() // Price per km (if mode = per_km)
      table.date('effective_from').notNullable()
      table.date('effective_until').nullable()
      table.boolean('is_peak').defaultTo(false).notNullable()
      table.decimal('peak_multiplier', 4, 2).defaultTo(1.0).notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['route_id', 'organization_id'])
      table.index(['effective_from'])
      table.index(['effective_until'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
