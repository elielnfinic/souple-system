import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blocked_entities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .enum('entity_type', ['phone', 'email', 'ip', 'device_fingerprint'])
        .notNullable()
      table.string('entity_value', 255).notNullable()
      table.text('reason').notNullable()
      table
        .bigInteger('blocked_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('expires_at').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['entity_type', 'entity_value'])
      table.index(['entity_type', 'entity_value'])
      table.index(['is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
