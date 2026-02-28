import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .bigInteger('booking_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('bookings')
        .onDelete('SET NULL')
      table.enum('type', ['direct', 'support', 'system']).notNullable().defaultTo('direct')
      table.string('title', 100).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_message_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['booking_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
