import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ticket_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('ticket_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('support_tickets')
        .onDelete('CASCADE')
      table
        .bigInteger('sender_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.boolean('is_internal_note').notNullable().defaultTo(false)
      table.text('content').notNullable()
      table.json('attachments').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['ticket_id'])
      table.index(['sender_user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
