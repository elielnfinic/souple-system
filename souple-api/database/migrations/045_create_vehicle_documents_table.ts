import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicle_documents'

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
        .enum('type', ['insurance', 'technical_visit', 'registration', 'permit', 'other'])
        .notNullable()
      table.string('document_number', 100).nullable()
      table.string('file_url', 500).notNullable()
      table.string('file_key', 255).nullable()
      table.date('issued_date').nullable()
      table.date('expiry_date').nullable()
      table
        .enum('status', ['valid', 'expiring_soon', 'expired', 'pending_renewal'])
        .notNullable()
        .defaultTo('valid')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['vehicle_id'])
      table.index(['type'])
      table.index(['expiry_date'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
