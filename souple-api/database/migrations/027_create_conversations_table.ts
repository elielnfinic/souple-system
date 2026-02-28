import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversations'

  up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.bigInteger('booking_id').unsigned().nullable().references('id').inTable('bookings').onDelete('SET NULL')
      table.bigInteger('trip_id').unsigned().nullable().references('id').inTable('trips').onDelete('SET NULL')
      table.enu('type', ['passenger_agency', 'passenger_driver', 'internal']).notNullable()
      table.bigInteger('participant_a_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.bigInteger('participant_b_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.bigInteger('participant_b_org_id').unsigned().nullable().references('id').inTable('organizations').onDelete('SET NULL')
      table.enu('status', ['active', 'archived', 'blocked']).notNullable().defaultTo('active')
      table.timestamp('last_message_at').nullable()
      table.timestamps(true, true)

      table.index(['participant_a_id', 'last_message_at'])
      table.index(['participant_b_id', 'last_message_at'])
      table.index(['participant_b_org_id', 'last_message_at'])
      table.index(['booking_id'])
    })
  }

  down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
