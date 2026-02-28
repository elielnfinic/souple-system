import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'telegram_links'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.bigInteger('telegram_chat_id').notNullable()
      table.string('telegram_username', 100).nullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('linked_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // One Telegram link per user
      table.unique(['user_id'])
      // Fast lookup by chat_id for incoming bot messages
      table.index(['telegram_chat_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
