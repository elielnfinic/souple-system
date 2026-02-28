import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('booking_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table
        .bigInteger('reviewer_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .bigInteger('vehicle_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('SET NULL')
      table
        .bigInteger('driver_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.tinyint('overall_rating').notNullable()
      table.tinyint('comfort_rating').nullable()
      table.tinyint('punctuality_rating').nullable()
      table.tinyint('driver_rating').nullable()
      table.text('comment').nullable()
      table.boolean('is_public').defaultTo(true).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id'])
      table.index(['vehicle_id'])
      table.index(['reviewer_user_id'])
      table.index(['overall_rating'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
