import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trip_shares'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('booking_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table.string('share_token', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['share_token'])
      table.index(['booking_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
