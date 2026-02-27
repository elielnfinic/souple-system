import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .enu('role', ['owner', 'manager', 'finance', 'ticketer', 'driver'])
        .notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('joined_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Constraints
      table.unique(['organization_id', 'user_id'])

      // Indexes
      table.index(['organization_id', 'is_active'])
      table.index(['user_id', 'is_active'])
      table.index(['organization_id', 'role'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
