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
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .enu('channel', ['email', 'sms', 'telegram', 'push'])
        .notNullable()
      table.string('type', 100).notNullable() // notification type or '*' for all
      table.boolean('enabled').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Unique: one preference row per (user, channel, type) combination
      table.unique(['user_id', 'channel', 'type'])
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
