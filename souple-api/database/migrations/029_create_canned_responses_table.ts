import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'canned_responses'

  up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.bigInteger('organization_id').unsigned().nullable().references('id').inTable('organizations').onDelete('SET NULL')
      table.string('category', 50).notNullable()
      table.json('text').notNullable() // {"fr": "...", "en": "...", "ln": "...", "sw": "..."}
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamps(true, true)

      table.index(['organization_id', 'category'])
    })
  }

  down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
