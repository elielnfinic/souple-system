import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agent_agreements'

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
        .bigInteger('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table.decimal('commission_rate', 4, 2).notNullable()
      table
        .enum('status', ['pending', 'active', 'suspended', 'terminated'])
        .notNullable()
        .defaultTo('pending')
      table.timestamp('starts_at').notNullable()
      table.timestamp('ends_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['agent_id', 'organization_id'])
      table.index(['agent_id'])
      table.index(['organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
