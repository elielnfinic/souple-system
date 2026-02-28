import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.bigInteger('conversation_id').unsigned().notNullable().references('id').inTable('conversations').onDelete('CASCADE')
      table.bigInteger('sender_id').unsigned().notNullable().references('id').inTable('users')
      table.text('content').notNullable()
      table.enu('type', ['text', 'image', 'system']).notNullable().defaultTo('text')
      table.string('image_url', 500).nullable()
      table.boolean('is_read').notNullable().defaultTo(false)
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())

      table.index(['conversation_id', 'created_at'])
      table.index(['sender_id'])
    })
  }

  down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
