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
      table.string('seat_id', 10).notNullable()
      table.string('seat_label', 50).nullable()
      table.string('seat_class', 20).nullable()
      table.tinyint('seat_row').unsigned().notNullable()
      table.tinyint('seat_col').unsigned().notNullable()
      table.boolean('is_bookable').defaultTo(true).notNullable()
      table.decimal('price_multiplier', 4, 2).defaultTo(1.0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['trip_id', 'seat_id'])
      table.index(['trip_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
