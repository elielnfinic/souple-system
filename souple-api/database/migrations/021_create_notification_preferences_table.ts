import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_preferences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.boolean('email_enabled').defaultTo(true).notNullable()
      table.boolean('sms_enabled').defaultTo(true).notNullable()
      table.boolean('push_enabled').defaultTo(true).notNullable()
      table.boolean('telegram_enabled').defaultTo(false).notNullable()
      table.boolean('booking_updates').defaultTo(true).notNullable()
      table.boolean('trip_updates').defaultTo(true).notNullable()
      table.boolean('promotions').defaultTo(false).notNullable()
      table.boolean('news').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
