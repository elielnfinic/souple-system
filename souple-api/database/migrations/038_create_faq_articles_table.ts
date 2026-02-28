import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'faq_articles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('category', 50).notNullable()
      table.string('title_fr', 255).notNullable()
      table.string('title_en', 255).nullable()
      table.text('body_fr').notNullable()
      table.text('body_en').nullable()
      table.boolean('is_published').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['category'])
      table.index(['is_published'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
