import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agent_commissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('agent_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agents')
        .onDelete('CASCADE')
      table
        .bigInteger('agreement_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agent_agreements')
        .onDelete('CASCADE')
      table
        .bigInteger('booking_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table.decimal('amount_cdf', 12, 2).notNullable()
      table.decimal('rate', 4, 2).notNullable()
      table
        .enum('status', ['pending', 'confirmed', 'paid', 'reversed'])
        .notNullable()
        .defaultTo('pending')
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['agent_id'])
      table.index(['booking_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
