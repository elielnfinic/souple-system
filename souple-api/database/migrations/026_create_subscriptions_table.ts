import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('organization_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .enum('tier', ['free', 'starter', 'pro', 'enterprise'])
        .defaultTo('free')
        .notNullable()
      table
        .enum('status', ['active', 'trialing', 'past_due', 'cancelled', 'expired'])
        .defaultTo('active')
        .notNullable()
      table
        .enum('billing_cycle', ['monthly', 'annual'])
        .defaultTo('monthly')
        .notNullable()
      table.timestamp('current_period_start').nullable()
      table.timestamp('current_period_end').nullable()
      table.timestamp('cancelled_at').nullable()
      table.timestamp('trial_ends_at').nullable()
      table.integer('max_vehicles').defaultTo(2)
      table.integer('max_trips_per_month').defaultTo(50)
      table.integer('max_users').defaultTo(5)
      table.decimal('commission_rate', 4, 2).defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['tier'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
