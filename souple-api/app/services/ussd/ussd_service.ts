import redis from '@adonisjs/redis/services/main'
import { ussdMessages } from './ussd_messages.js'
import type { UssdSessionData, UssdStep } from './ussd_session.js'
import { matchCity } from './city_matcher.js'
import db from '@adonisjs/lucid/services/db'

const SESSION_TTL = 300 // 5 min

export class UssdService {
  async handleRequest(params: {
    sessionId: string
    phoneNumber: string
    text: string
  }): Promise<{ type: 'CON' | 'END'; message: string }> {
    const key = `ussd:session:${params.sessionId}`
    const raw = await redis.get(key)
    const session: UssdSessionData = raw ? JSON.parse(raw) : {
      step: 'main', locale: 'fr', phoneNumber: params.phoneNumber
    }

    const inputs = params.text ? params.text.split('*') : ['']
    const lastInput = inputs[inputs.length - 1].trim()
    const depth = params.text ? inputs.length : 0

    const result = await this.processStep(session, lastInput, depth)

    if (result.type === 'CON') {
      await redis.setex(key, SESSION_TTL, JSON.stringify(session))
    } else {
      await redis.del(key)
    }
    return result
  }

  private async processStep(
    session: UssdSessionData,
    input: string,
    depth: number
  ): Promise<{ type: 'CON' | 'END'; message: string }> {
    const m = ussdMessages[session.locale]

    // depth 0 or step=main with no input → show welcome
    if (depth === 0 || (depth === 1 && !input)) {
      session.step = 'main'
      return { type: 'CON', message: m.welcome }
    }

    switch (session.step) {
      case 'main': {
        if (input === '1') { session.step = 'search_from'; return { type: 'CON', message: m.enterFrom } }
        if (input === '2') { session.step = 'my_bookings'; return { type: 'CON', message: m.enterBookingCode } }
        if (input === '3') { session.step = 'booking_status'; return { type: 'CON', message: m.enterBookingCode } }
        if (input === '4') {
          session.step = 'language_select'
          return { type: 'CON', message: 'Langue:\n1. Français\n2. English\n3. Lingala\n4. Kiswahili' }
        }
        if (input === '0') return { type: 'END', message: m.goodbye }
        return { type: 'CON', message: m.invalidInput + '\n0. ' + m.welcome.split('\n')[0] }
      }

      case 'language_select': {
        const langs = ['fr', 'en', 'ln', 'sw'] as const
        const idx = parseInt(input) - 1
        if (idx >= 0 && idx < 4) {
          session.locale = langs[idx]
          session.step = 'main'
          return { type: 'CON', message: ussdMessages[session.locale].welcome }
        }
        return { type: 'CON', message: m.invalidInput }
      }

      case 'search_from': {
        if (input === '0') { session.step = 'main'; return { type: 'CON', message: m.welcome } }
        const cities = await db.from('cities').where('is_active', true).select('id', 'name')
        const match = matchCity(input, cities as any)
        if (!match.city) {
          if (match.candidates.length > 0) {
            const opts = match.candidates.slice(0, 3).map((c, i) => `${i + 1}. ${(c as any).name}`).join('\n')
            return { type: 'CON', message: `Voulez-vous dire:\n${opts}\n0. ${m.enterFrom}` }
          }
          return { type: 'CON', message: m.cityNotFound + '\n' + m.enterFrom }
        }
        session.fromCity = (match.city as any).name
        session.fromCityId = (match.city as any).id
        session.step = 'search_to'
        return { type: 'CON', message: m.enterTo }
      }

      case 'search_to': {
        if (input === '0') { session.step = 'search_from'; return { type: 'CON', message: m.enterFrom } }
        const cities = await db.from('cities').where('is_active', true).select('id', 'name')
        const match = matchCity(input, cities as any)
        if (!match.city) return { type: 'CON', message: m.cityNotFound + '\n' + m.enterTo }
        session.toCity = (match.city as any).name
        session.toCityId = (match.city as any).id
        session.step = 'search_date'
        return { type: 'CON', message: m.enterDate }
      }

      case 'search_date': {
        if (input === '0') { session.step = 'search_to'; return { type: 'CON', message: m.enterTo } }
        const parts = input.split('/')
        if (parts.length < 2) return { type: 'CON', message: m.invalidInput + '\n' + m.enterDate }
        const [day, month] = parts
        const year = new Date().getFullYear()
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const trips = await this.searchTrips(session.fromCityId!, session.toCityId!, dateStr)
        if (!trips.length) return { type: 'CON', message: m.noTrips }
        session.trips = trips
        session.date = input
        session.step = 'select_trip'
        const list = trips
          .slice(0, 3)
          .map((t, i) => `${i + 1}. ${t.departureAt.slice(11, 16)} - ${t.agency} - ${t.price} FC - ${t.seats} pl.`)
          .join('\n')
        return { type: 'CON', message: `${m.enterDate.replace(':', '')} ${input}:\n${list}\n0. Retour` }
      }

      case 'select_trip': {
        if (input === '0') { session.step = 'search_date'; return { type: 'CON', message: m.enterDate } }
        const idx = parseInt(input) - 1
        if (!session.trips || idx < 0 || idx >= session.trips.length) return { type: 'CON', message: m.invalidInput }
        const trip = session.trips[idx]
        session.selectedTripId = trip.id
        session.selectedTripIndex = idx
        session.step = 'select_seats'
        return {
          type: 'CON',
          message: `${trip.agency} ${session.date} ${trip.departureAt.slice(11, 16)}\n${session.fromCity}→${session.toCity}\n${trip.price} FC\n${m.selectSeats}`
        }
      }

      case 'select_seats': {
        if (input === '0') { session.step = 'select_trip'; return { type: 'CON', message: m.enterDate } }
        const count = parseInt(input)
        if (isNaN(count) || count < 1 || count > 3) return { type: 'CON', message: m.invalidInput }
        session.seatCount = count
        session.step = 'select_payment'
        const total = session.trips![session.selectedTripIndex!].price * count
        return { type: 'CON', message: `${count} place(s) - ${total} FC\n${m.selectPayment}` }
      }

      case 'select_payment': {
        if (input === '0') { session.step = 'select_seats'; return { type: 'CON', message: m.selectSeats } }
        const providers = { '1': 'mtn', '2': 'orange', '3': 'airtel' } as Record<string, string>
        if (!providers[input]) return { type: 'CON', message: m.invalidInput }
        session.paymentProvider = providers[input]
        session.step = 'enter_phone'
        return { type: 'CON', message: m.enterPhone }
      }

      case 'enter_phone': {
        if (input === '0') { session.step = 'select_payment'; return { type: 'CON', message: m.selectPayment } }
        const digits = input.replace(/\D/g, '')
        if (digits.length < 9) return { type: 'CON', message: m.enterPhone }
        // Fire-and-forget booking
        this.createUssdBooking(session, digits).catch(e => console.error('USSD booking error:', e))
        return { type: 'END', message: m.paymentSent }
      }

      case 'booking_status':
      case 'my_bookings': {
        if (input === '0') { session.step = 'main'; return { type: 'CON', message: m.welcome } }
        const booking = await this.lookupBooking(input.toUpperCase())
        if (!booking) return { type: 'END', message: `Réservation ${input} introuvable.` }
        return { type: 'END', message: booking }
      }

      default:
        session.step = 'main'
        return { type: 'CON', message: m.welcome }
    }
  }

  private async searchTrips(fromCityId: number, toCityId: number, date: string) {
    try {
      const rows = await db.rawQuery(
        `SELECT t.id, t.departure_at, COALESCE(o.name, 'Indépendant') as agency, t.total_seats as seats
         FROM trips t
         LEFT JOIN organizations o ON o.id = t.organization_id
         JOIN trip_stops ts_b ON ts_b.trip_id = t.id AND ts_b.city_id = ? AND ts_b.boarding_enabled = 1
         JOIN trip_stops ts_a ON ts_a.trip_id = t.id AND ts_a.city_id = ? AND ts_a.alighting_enabled = 1
         WHERE ts_b.stop_order < ts_a.stop_order AND DATE(t.departure_at) = ?
           AND t.status IN ('scheduled','boarding')
         LIMIT 3`,
        [fromCityId, toCityId, date]
      )
      return (rows[0] as any[]).map(r => ({
        id: r.id,
        departureAt: String(r.departure_at),
        agency: r.agency,
        price: 45000,
        seats: r.seats,
      }))
    } catch { return [] }
  }

  private async createUssdBooking(session: UssdSessionData, phone: string) {
    // Stub: in production integrate with BookingService + PaymentService
    console.log(`[USSD] Booking: trip=${session.selectedTripId} seats=${session.seatCount} phone=${phone} provider=${session.paymentProvider}`)
  }

  private async lookupBooking(code: string): Promise<string | null> {
    try {
      const row = await db
        .from('bookings')
        .where('booking_code', code)
        .first()
      if (!row) return null
      return `Réservation ${code}\nStatut: ${row.status}\nMontant: ${row.total_amount} FC`
    } catch { return null }
  }
}

export default new UssdService()
