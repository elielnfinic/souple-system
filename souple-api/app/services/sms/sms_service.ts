import db from '@adonisjs/lucid/services/db'

export class SmsService {
  async sendSms(to: string, message: string): Promise<void> {
    const cleaned = message.length > 160 ? message.slice(0, 157) + '...' : message
    const phone = to.startsWith('+') ? to : `+243${to.replace(/^0/, '')}`

    const apiKey = process.env.AT_API_KEY
    if (!apiKey) {
      console.log(`[SMS STUB] To: ${phone} | ${cleaned}`)
      return
    }

    try {
      await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: process.env.AT_USERNAME || 'sandbox',
          to: phone,
          message: cleaned,
          from: process.env.AT_SENDER_ID || 'Souple',
        }).toString(),
      })
    } catch (e) {
      console.error('[SMS] Send failed:', e)
    }
  }

  async handleInbound(from: string, body: string): Promise<string | null> {
    const text = body.trim().toUpperCase()

    if (text.startsWith('BOOK ')) return this.handleBook(text)
    if (text.startsWith('STATUS ')) return this.handleStatus(text)
    if (text.startsWith('CANCEL ')) return this.handleCancel(text)
    if (text === 'HELP') return 'Souple: BOOK KIN LUB 15/03 | STATUS SP-XXXX | CANCEL SP-XXXX | Composez *123# pour réserver.'
    if (text.startsWith('LANG ')) return this.handleLang(text)
    return 'Souple: Commande inconnue. Envoyez HELP.'
  }

  private async handleBook(text: string): Promise<string> {
    return 'Souple: Pour réserver, composez *123# depuis votre téléphone. C\'est rapide et gratuit!'
  }

  private async handleStatus(text: string): Promise<string> {
    const code = text.replace('STATUS ', '').trim()
    try {
      const row = await db.from('bookings').where('booking_code', code).first()
      if (!row) return `Souple: Réservation ${code} introuvable. Vérifiez le code.`
      return `Souple: ${code} - ${String(row.status).toUpperCase()}. Montant: ${row.total_amount} FC.`
    } catch {
      return 'Souple: Erreur système. Réessayez.'
    }
  }

  private async handleCancel(text: string): Promise<string> {
    const code = text.replace('CANCEL ', '').trim()
    return `Souple: Pour annuler ${code}, connectez-vous sur souple.cd ou appelez le support.`
  }

  private async handleLang(text: string): Promise<string> {
    const lang = text.replace('LANG ', '').trim().toUpperCase()
    if (['FR', 'EN', 'LN', 'SW'].includes(lang)) return `Souple: Langue changée en ${lang}.`
    return 'Souple: Langues disponibles: FR EN LN SW'
  }
}

export default new SmsService()
