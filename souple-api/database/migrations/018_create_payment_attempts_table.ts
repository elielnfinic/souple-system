import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payment_attempts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('payment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payments')
        .onDelete('CASCADE')
      table.tinyint('attempt_number').defaultTo(1)
      table
        .enum('status', ['pending', 'processing', 'succeeded', 'failed'])
        .defaultTo('pending')
        .notNullable()
      table.string('error_code', 50).nullable()
      table.text('error_message').nullable()
      table.json('provider_response').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['payment_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
