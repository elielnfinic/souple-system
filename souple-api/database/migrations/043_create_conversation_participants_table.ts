import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversation_participants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('conversation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('conversations')
        .onDelete('CASCADE')
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('unread_count').notNullable().defaultTo(0)
      table.timestamp('last_read_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['conversation_id', 'user_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
