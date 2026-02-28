import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parcels'

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
        .bigInteger('trip_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('trips')
        .onDelete('SET NULL')
      table.string('tracking_code', 30).unique().notNullable()
      table.string('sender_name', 100).notNullable()
      table.string('sender_phone', 20).notNullable()
      table.string('receiver_name', 100).notNullable()
      table.string('receiver_phone', 20).notNullable()
      table
        .bigInteger('origin_city_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('cities')
        .onDelete('RESTRICT')
      table
        .bigInteger('destination_city_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('cities')
        .onDelete('RESTRICT')
      table.text('description').nullable()
      table.decimal('weight_kg', 6, 2).nullable()
      table.boolean('fragile').defaultTo(false).notNullable()
      table.decimal('declared_value_cdf', 12, 2).nullable()
      table.decimal('price_cdf', 12, 2).defaultTo(0).nullable()
      table
        .enum('status', ['pending', 'accepted', 'in_transit', 'arrived', 'delivered', 'returned', 'lost'])
        .defaultTo('pending')
        .notNullable()
      table.timestamp('pickup_at').nullable()
      table.timestamp('delivered_at').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['trip_id'])
      table.index(['status'])
      table.index(['tracking_code'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
