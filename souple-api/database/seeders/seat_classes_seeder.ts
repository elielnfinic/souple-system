import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'

export default class SeatClassesSeeder extends BaseSeeder {
  async run() {
    const existing = await db.from('seat_classes').count('* as total').first()
    if (existing && Number(existing.total) > 0) return

    await db.table('seat_classes').insert([
      {
        name: 'Economy',
        slug: 'economy',
        description: 'Standard seating with basic comfort. Ideal for budget-conscious travellers.',
        default_multiplier: 1.0,
        color: '#6B7280',
        icon: 'armchair',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Business',
        slug: 'business',
        description: 'Enhanced comfort with extra legroom and priority boarding.',
        default_multiplier: 1.5,
        color: '#3B82F6',
        icon: 'briefcase',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'VIP',
        slug: 'vip',
        description: 'Premium seating with reclining seats, AC, and dedicated service.',
        default_multiplier: 2.0,
        color: '#F59E0B',
        icon: 'star',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  }
}
