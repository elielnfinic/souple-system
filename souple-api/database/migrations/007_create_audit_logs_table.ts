import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table.bigInteger('organization_id').unsigned().nullable()
      table.bigInteger('user_id').unsigned().nullable()
      table.string('action', 100).notNullable()
      table.string('entity_type', 100).notNullable()
      table.bigInteger('entity_id').unsigned().nullable()
      table.json('old_values').nullable()
      table.json('new_values').nullable()
      table.string('ip_address', 45).nullable()
      table.text('user_agent').nullable()
      table.timestamp('created_at').notNullable()

      // Indexes (no updated_at — audit logs are immutable)
      table.index(['organization_id', 'created_at'])
      table.index(['user_id', 'created_at'])
      table.index(['entity_type', 'entity_id'])
      table.index(['action'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
