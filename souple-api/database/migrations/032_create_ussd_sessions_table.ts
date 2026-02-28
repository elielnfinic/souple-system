import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ussd_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.string('session_id', 100).notNullable().unique()
      table.string('phone', 20).notNullable()
      table.string('step', 50).notNullable().defaultTo('start')
      table.json('data').nullable()
      table.enum('language', ['fr', 'en', 'ln', 'sw']).notNullable().defaultTo('fr')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['session_id'])
      table.index(['phone'])
      table.index(['is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
