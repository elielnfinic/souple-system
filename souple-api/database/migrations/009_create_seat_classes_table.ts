import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seat_classes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('name', 50).notNullable()
      table.string('slug', 50).notNullable()
      table.text('description').nullable()
      table.decimal('default_multiplier', 4, 2).defaultTo(1.0)
      table.string('color', 7).nullable()
      table.string('icon', 50).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['slug'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
