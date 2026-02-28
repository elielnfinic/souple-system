import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'maintenance_records'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table
        .enum('type', [
          'oil_change',
          'tire_rotation',
          'brake_service',
          'engine',
          'transmission',
          'inspection',
          'repair',
          'other',
        ])
        .notNullable()
      table.string('performed_by', 100).nullable()
      table.date('performed_at').notNullable()
      table.integer('odometer_km').nullable()
      table.decimal('cost_cdf', 12, 2).nullable()
      table.text('description').notNullable()
      table.integer('next_service_km').nullable()
      table.date('next_service_date').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['vehicle_id'])
      table.index(['type'])
      table.index(['performed_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
