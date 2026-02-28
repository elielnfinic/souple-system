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
        .onDelete('SET NULL')
      table
        .bigInteger('owner_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table.string('type', 50).notNullable()
      table.string('brand', 50).notNullable()
      table.string('model', 50).notNullable()
      table.smallint('year').unsigned().nullable()
      table.string('color', 30).notNullable()
      table.string('plate_number', 20).notNullable()
      table.string('chassis_number', 50).nullable()
      table.smallint('total_seats').unsigned().notNullable()
      table
        .enum('visibility', ['public', 'private'])
        .defaultTo('public')
        .notNullable()
      table.boolean('is_available_for_rental').defaultTo(false).notNullable()
      table
        .enum('verification_status', ['pending', 'verified', 'rejected'])
        .defaultTo('pending')
        .notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.decimal('rating', 3, 2).defaultTo(5.0)
      table.integer('total_trips').defaultTo(0)
      table.json('features').nullable()
      table.json('photos').nullable()
      table.date('insurance_expiry').nullable()
      table.date('technical_visit_expiry').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['plate_number'])
      table.unique(['chassis_number'])

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
