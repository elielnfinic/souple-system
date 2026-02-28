import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
import { waMessages, type WaLocale } from './whatsapp_messages.js'

const SESSION_TTL = 1800 // 30 min

interface WaSession {
  step: string
  locale: WaLocale
  userId?: number
  fromCity?: string
  fromCityId?: number
  toCity?: string
  toCityId?: number
  date?: string
  trips?: Array<{ id: number; departureAt: string; agency: string; price: number; seats: number }>
  selectedTripIdx?: number
  seatCount?: number
  paymentProvider?: string
}

export class WhatsAppService {
  private botToken = process.env.WHATSAPP_BOT_TOKEN || ''
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''

  async handleIncoming(phoneNumber: string, messageText: string): Promise<void> {
    const key = `whatsapp:conversation:${phoneNumber}`
    const raw = await redis.get(key)
    const session: WaSession = raw ? JSON.parse(raw) : { step: 'idle', locale: 'fr' }
    const m = waMessages[session.locale]
    const text = messageText.trim()
    const lower = text.toLowerCase()

    let reply = ''

    // Global commands
    if (['help', 'aide', 'msaada'].includes(lower)) {
      reply = m.help
    } else if (lower.startsWith('lang ') || lower.startsWith('lugha ')) {
      const lang = lower.split(' ')[1]?.trim()
      const map: Record<string, WaLocale> = { fr: 'fr', en: 'en', ln: 'ln', sw: 'sw', français: 'fr', english: 'en', lingala: 'ln', swahili: 'sw' }
      session.locale = map[lang] || 'fr'
      session.step = 'idle'
      reply = waMessages[session.locale].welcome
    } else {
      reply = await this.processStep(session, text, phoneNumber)
    }

    await redis.setex(key, SESSION_TTL, JSON.stringify(session))
    await this.sendText(phoneNumber, reply)
  }

  private async processStep(session: WaSession, input: string, phone: string): Promise<string> {
    const m = waMessages[session.locale]

    switch (session.step) {
      case 'idle':
      case 'main': {
        if (input === '1' || /^(search|cherch|tafuta|koluka)/i.test(input)) {
          session.step = 'search_from'; return m.enterFrom
        }
        if (input === '2' || /^(status|booking|réservation)/i.test(input)) {
          session.step = 'check_booking'; return m.checkCode
        }
        if (input === '3' || /^(support|help|aide)/i.test(input)) {
          session.step = 'support'; return m.supportMenu
        }
        if (input === '4') { session.step = 'language'; return 'Langue:\n1 Français\n2 English\n3 Lingala\n4 Kiswahili' }

        // Natural language trip search: "Kinshasa Lubumbashi 15/03"
        const parts = input.split(/\s+/)
        if (parts.length >= 3 && /\d{1,2}\/\d{1,2}/.test(parts[parts.length - 1])) {
          session.fromCity = parts[0]
          session.toCity = parts[1]
          session.date = parts[parts.length - 1]
          return await this.searchAndShowTrips(session)
        }
        return m.welcome
      }

      case 'language': {
        const langs: WaLocale[] = ['fr', 'en', 'ln', 'sw']
        const idx = parseInt(input) - 1
        if (idx >= 0 && idx < 4) { session.locale = langs[idx]; session.step = 'idle'; return waMessages[session.locale].welcome }
        return m.welcome
      }

      case 'search_from': {
        session.fromCity = input; session.step = 'search_to'; return m.enterTo
      }
      case 'search_to': {
        session.toCity = input; session.step = 'search_date'; return m.enterDate
      }
      case 'search_date': {
        session.date = input; return await this.searchAndShowTrips(session)
      }
      case 'select_trip': {
        const idx = parseInt(input) - 1
        if (!session.trips || idx < 0 || idx >= session.trips.length) return m.error
        session.selectedTripIdx = idx; session.step = 'select_seats'; return m.enterSeats
      }
      case 'select_seats': {
        const n = parseInt(input)
        if (isNaN(n) || n < 1 || n > 5) return m.enterSeats
        session.seatCount = n; session.step = 'select_payment'; return m.selectPayment
      }
      case 'select_payment': {
        const map: Record<string, string> = { '1': 'mtn', '2': 'orange', '3': 'airtel' }
        if (!map[input]) return m.selectPayment
        session.paymentProvider = map[input]; session.step = 'enter_phone'; return m.enterPhone
      }
      case 'enter_phone': {
        const digits = input.replace(/\D/g, '')
        if (digits.length < 9) return m.enterPhone
        this.createWaBooking(session, digits).catch(console.error)
        session.step = 'idle'
        return m.paymentSent
      }
      case 'check_booking': {
        const row = await db.from('bookings').where('booking_code', input.toUpperCase()).first()
        session.step = 'idle'
        if (!row) return `Réservation ${input} introuvable.`
        return `✅ *${input}*\nStatut: ${row.status}\nMontant: ${row.total_amount} FC`
      }
      case 'support': {
        session.step = 'idle'
        return `✅ Votre demande a été transmise à notre équipe. Nous répondons dans les 4 heures.\n\nPour joindre le support: support@souple.cd`
      }
      default:
        session.step = 'idle'; return m.welcome
    }
  }

  private async searchAndShowTrips(session: WaSession): Promise<string> {
    const m = waMessages[session.locale]
    try {
      const [day, month] = (session.date || '').split('/')
      const year = new Date().getFullYear()
      const dateStr = `${year}-${(month || '01').padStart(2, '0')}-${(day || '01').padStart(2, '0')}`

      // Simple keyword search on city names
      const fromCity = await db.from('cities').whereRaw('LOWER(name) LIKE ?', [`%${session.fromCity?.toLowerCase()}%`]).first()
      const toCity = await db.from('cities').whereRaw('LOWER(name) LIKE ?', [`%${session.toCity?.toLowerCase()}%`]).first()

      if (!fromCity || !toCity) return m.noTrips

      session.fromCityId = fromCity.id; session.toCityId = toCity.id

      const rows = await db.rawQuery(
        `SELECT t.id, t.departure_at, COALESCE(o.name,'Indépendant') as agency, t.total_seats as seats
         FROM trips t LEFT JOIN organizations o ON o.id = t.organization_id
         JOIN trip_stops ts_b ON ts_b.trip_id = t.id AND ts_b.city_id = ? AND ts_b.boarding_enabled = 1
         JOIN trip_stops ts_a ON ts_a.trip_id = t.id AND ts_a.city_id = ? AND ts_a.alighting_enabled = 1
         WHERE ts_b.stop_order < ts_a.stop_order AND DATE(t.departure_at) = ?
           AND t.status IN ('scheduled','boarding') LIMIT 3`,
        [fromCity.id, toCity.id, dateStr]
      )
      const trips = (rows[0] as any[]).map(r => ({
        id: r.id, departureAt: String(r.departure_at), agency: r.agency, price: 45000, seats: r.seats
      }))

      if (!trips.length) return m.noTrips
      session.trips = trips; session.step = 'select_trip'

      const list = trips.map((t, i) =>
        `${i + 1}️⃣ ${t.departureAt.slice(11, 16)} | ${t.agency} | *${t.price.toLocaleString()} FC* | ${t.seats} places`
      ).join('\n')
      return `Trajets *${session.fromCity}* → *${session.toCity}* le ${session.date}:\n\n${list}\n\nRépondez avec le numéro du trajet.`
    } catch (e) {
      console.error('[WhatsApp] Trip search error:', e)
      return m.error
    }
  }

  private async createWaBooking(session: WaSession, phone: string) {
    console.log(`[WhatsApp] Booking: trip=${session.trips?.[session.selectedTripIdx ?? 0]?.id} seats=${session.seatCount} phone=${phone}`)
  }

  async sendText(to: string, text: string): Promise<void> {
    if (!this.botToken || !this.phoneNumberId) {
      console.log(`[WA STUB] To: ${to} | ${text.slice(0, 100)}`)
      return
    }
    try {
      await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      })
    } catch (e) {
      console.error('[WhatsApp] Send error:', e)
    }
  }

  async sendTemplate(to: string, templateName: string, params: Record<string, string>): Promise<void> {
    if (!this.botToken) { console.log(`[WA STUB] Template ${templateName} to ${to}`); return }
    const components = Object.values(params).map(v => ({ type: 'text', text: v }))
    try {
      await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to, type: 'template',
          template: { name: templateName, language: { code: 'fr' }, components: [{ type: 'body', parameters: components }] }
        }),
      })
    } catch (e) { console.error('[WhatsApp] Template error:', e) }
  }
}

export default new WhatsAppService()
