import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'incidents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('reporter_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .bigInteger('trip_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('trips')
        .onDelete('SET NULL')
      table
        .enum('type', ['accident', 'breakdown', 'crime', 'harassment', 'medical', 'other'])
        .notNullable()
      table.text('description').notNullable()
      table.decimal('location_lat', 10, 8).nullable()
      table.decimal('location_lng', 11, 8).nullable()
      table.json('photos').nullable()
      table
        .enum('status', ['reported', 'investigating', 'resolved', 'dismissed'])
        .notNullable()
        .defaultTo('reported')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['reporter_user_id'])
      table.index(['trip_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
