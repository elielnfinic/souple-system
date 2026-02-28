import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'kyc_documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').unsigned().primary()
      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .enum('type', ['national_id', 'passport', 'drivers_license', 'business_license', 'vehicle_registration'])
        .notNullable()
      table
        .enum('status', ['pending', 'under_review', 'approved', 'rejected', 'expired'])
        .defaultTo('pending')
        .notNullable()
      table.string('file_url', 500).notNullable()
      table.string('file_key', 255).nullable()
      table.date('expiry_date').nullable()
      table.string('document_number', 100).nullable()
      table
        .bigInteger('verified_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('verified_at').nullable()
      table.text('rejection_reason').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
      table.index(['status'])
      table.index(['type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
