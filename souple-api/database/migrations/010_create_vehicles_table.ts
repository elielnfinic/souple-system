import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .bigInteger('owner_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('type', 50).notNullable() // minibus, bus, sedan, van, pickup
      table.string('brand', 50).notNullable()
      table.string('model', 50).notNullable()
      table.smallint('year').unsigned().nullable()
      table.string('color', 30).notNullable()
      table.string('plate_number', 20).unique().notNullable()
      table.string('chassis_number', 50).unique().nullable()
      table.smallint('total_seats').unsigned().notNullable()
      table
        .enu('visibility', ['public', 'private'])
        .defaultTo('public')
        .notNullable()
      table.boolean('is_available_for_rental').defaultTo(false).notNullable()
      table
        .enu('verification_status', ['pending', 'verified', 'rejected'])
        .defaultTo('pending')
        .notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.decimal('rating', 3, 2).defaultTo(5.0).nullable()
      table.integer('total_trips').unsigned().defaultTo(0).notNullable()
      table.json('features').nullable() // array of strings e.g. ["ac", "wifi"]
      table.json('photos').nullable() // array of objects [{url, key, is_primary}]
      table.date('insurance_expiry').nullable()
      table.date('technical_visit_expiry').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['organization_id'])
      table.index(['owner_user_id'])
      table.index(['visibility'])
      table.index(['verification_status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
