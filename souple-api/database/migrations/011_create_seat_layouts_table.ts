import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seat_layouts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.tinyint('rows').unsigned().notNullable()
      table.tinyint('columns').unsigned().notNullable()
      table.json('layout_data').notNullable()
      table.boolean('is_default').defaultTo(false).notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['vehicle_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
