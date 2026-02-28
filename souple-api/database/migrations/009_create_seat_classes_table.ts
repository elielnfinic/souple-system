import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seat_classes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('name', 50).notNullable()
      table.string('slug', 50).unique().notNullable()
      table.text('description').nullable()
      table.decimal('default_multiplier', 4, 2).defaultTo(1.0).notNullable()
      table.string('color', 7).nullable() // hex color e.g. '#FFD700'
      table.string('icon', 50).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
