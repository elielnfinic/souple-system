import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('name', 100).notNullable()
      table.string('province', 100).notNullable()
      table.string('country', 50).defaultTo('CD').notNullable()
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()
      table.string('timezone', 50).defaultTo('Africa/Lubumbashi').notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Unique constraint
      table.unique(['name', 'province', 'country'])

      // Indexes
      table.index(['country', 'is_active'])
      table.index(['province'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
