import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('name', 255).notNullable()
      table.string('slug', 100).unique().notNullable()
      table.enu('type', ['agency', 'company', 'independent']).notNullable()
      table.string('logo_url', 500).nullable()
      table.text('address').nullable()
      table.string('city', 100).notNullable()
      table.string('country', 50).defaultTo('CD').notNullable()
      table.string('phone', 20).notNullable()
      table.string('email', 255).notNullable()
      table.string('tax_id', 100).nullable()
      table.tinyint('required_kyc_level').unsigned().defaultTo(0).notNullable()
      table.boolean('is_public').defaultTo(false).notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.json('settings').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['is_active'])
      table.index(['type'])
      table.index(['slug'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
