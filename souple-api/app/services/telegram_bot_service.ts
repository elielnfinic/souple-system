import { DateTime } from 'luxon'
import env from '#start/env'
import redis from '@adonisjs/redis/services/main'
import TelegramLink from '#models/telegram_link'
import User from '#models/user'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      username?: string
      first_name?: string
    }
    chat: { id: number }
    text?: string
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * TelegramBotService — handles incoming Telegram webhook updates and provides
 * utilities for generating link codes and sending messages.
 *
 * Bot commands:
 *   /start         Welcome message + link instructions
 *   /link <code>   Link account using 6-char code from web app
 *   /unlink        Remove the Telegram link
 *   /bookings      List the user's recent bookings
 *   /track <code>  Track a booking by its code (e.g. SP-XXXX)
 */
export class TelegramBotService {
  private readonly LINK_CODE_TTL = 10 * 60  // 10 minutes in seconds
  private readonly LINK_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // unambiguous chars

  private get botToken(): string {
    return env.get('TELEGRAM_BOT_TOKEN', '') ?? ''
  }

  private get apiBase(): string {
    return `https://api.telegram.org/bot${this.botToken}`
  }

  private isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.trim().length > 0)
  }

  // ─── Webhook handler ─────────────────────────────────────────────────────

  /**
   * Process an incoming Telegram update (called from controller webhook endpoint).
   * Silently ignores updates without a message.text.
   */
  async handleWebhook(body: TelegramUpdate): Promise<void> {
    const message = body?.message
    if (!message?.text) return

    const chatId = message.chat.id
    const text = message.text.trim()
    const username = message.from?.username ?? null

    if (text === '/start' || text.startsWith('/start ')) {
      await this.handleStart(chatId)
    } else if (text.startsWith('/link ')) {
      const code = text.split(' ')[1]?.trim().toUpperCase() ?? ''
      await this.handleLink(chatId, code, username)
    } else if (text === '/unlink') {
      await this.handleUnlink(chatId)
    } else if (text === '/bookings') {
      await this.handleBookings(chatId)
    } else if (text.startsWith('/track ')) {
      const bookingCode = text.split(' ')[1]?.trim().toUpperCase() ?? ''
      await this.handleTrack(chatId, bookingCode)
    } else {
      await this.sendMessage(
        chatId,
        'Commandes disponibles:\n/start — Aide\n/link <code> — Lier votre compte\n/unlink — Délier\n/bookings — Mes réservations\n/track <code> — Suivre une réservation'
      )
    }
  }

  // ─── Command handlers ─────────────────────────────────────────────────────

  private async handleStart(chatId: number): Promise<void> {
    await this.sendMessage(
      chatId,
      `Bienvenue sur *Souple* 🚌\n\nPour recevoir vos notifications ici, liez votre compte :\n1. Ouvrez l'application Souple\n2. Allez dans Paramètres → Notifications → Telegram\n3. Obtenez votre code de liaison\n4. Envoyez ici : /link <votre-code>\n\nBesoin d'aide ? Visitez https://souple.cd`
    )
  }

  private async handleLink(chatId: number, code: string, username: string | null): Promise<void> {
    if (!code || code.length !== 6) {
      await this.sendMessage(chatId, 'Code invalide. Utilisez : /link <code> (6 caractères)')
      return
    }

    const redisKey = `telegram:link:${code}`
    const storedUserId = await redis.get(redisKey)

    if (!storedUserId) {
      await this.sendMessage(
        chatId,
        'Code expiré ou invalide. Générez un nouveau code dans l\'application Souple.'
      )
      return
    }

    const userId = Number(storedUserId)
    const user = await User.find(userId)

    if (!user) {
      await this.sendMessage(chatId, 'Utilisateur introuvable. Réessayez depuis l\'application.')
      return
    }

    // Upsert — if the user already linked, update with new chat_id
    await TelegramLink.updateOrCreate(
      { userId },
      {
        telegramChatId: chatId,
        telegramUsername: username,
        isActive: true,
        linkedAt: DateTime.utc(),
      }
    )

    // Consume the code
    await redis.del(redisKey)

    await this.sendMessage(
      chatId,
      `✅ Compte lié avec succès !\nBonjour *${user.firstName}*, vous recevrez désormais vos notifications Souple ici.`
    )
  }

  private async handleUnlink(chatId: number): Promise<void> {
    const link = await TelegramLink.query()
      .where('telegram_chat_id', chatId)
      .where('is_active', true)
      .first()

    if (!link) {
      await this.sendMessage(chatId, 'Aucun compte n\'est lié à ce chat.')
      return
    }

    link.isActive = false
    await link.save()

    await this.sendMessage(chatId, 'Votre compte Souple a été délié. Vous ne recevrez plus de notifications ici.')
  }

  private async handleBookings(chatId: number): Promise<void> {
    const link = await TelegramLink.query()
      .where('telegram_chat_id', chatId)
      .where('is_active', true)
      .first()

    if (!link) {
      await this.sendMessage(chatId, 'Veuillez d\'abord lier votre compte avec /link <code>.')
      return
    }

    try {
      // Dynamic import to avoid circular deps
      const db = (await import('@adonisjs/lucid/services/db')).default

      const bookings = await db
        .from('bookings')
        .where('user_id', link.userId)
        .whereIn('status', ['confirmed', 'checked_in', 'pending'])
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('booking_code', 'status', 'created_at', 'total_amount', 'currency')

      if (bookings.length === 0) {
        await this.sendMessage(chatId, 'Vous n\'avez pas de réservations récentes.')
        return
      }

      const lines = bookings.map(
        (b: any) => `• *${b.booking_code}* — ${b.status} — ${b.total_amount} ${b.currency}`
      )
      await this.sendMessage(
        chatId,
        `Vos 5 dernières réservations :\n${lines.join('\n')}\n\nUtilisez /track <code> pour suivre une réservation.`
      )
    } catch (error) {
      console.error('[TelegramBot] handleBookings error:', error)
      await this.sendMessage(chatId, 'Une erreur est survenue. Réessayez plus tard.')
    }
  }

  private async handleTrack(chatId: number, bookingCode: string): Promise<void> {
    if (!bookingCode) {
      await this.sendMessage(chatId, 'Usage : /track SP-XXXXXXXX')
      return
    }

    try {
      const db = (await import('@adonisjs/lucid/services/db')).default

      const booking = await db
        .from('bookings')
        .where('booking_code', bookingCode)
        .first()

      if (!booking) {
        await this.sendMessage(chatId, `Réservation *${bookingCode}* introuvable.`)
        return
      }

      await this.sendMessage(
        chatId,
        `📋 *Réservation ${booking.booking_code}*\nStatut : ${booking.status}\nPassager : ${booking.passenger_name}\nMontant : ${booking.total_amount} ${booking.currency}\n\nPour plus de détails, ouvrez l'application Souple.`
      )
    } catch (error) {
      console.error('[TelegramBot] handleTrack error:', error)
      await this.sendMessage(chatId, 'Une erreur est survenue. Réessayez plus tard.')
    }
  }

  // ─── Link code generation ─────────────────────────────────────────────────

  /**
   * Generate a 6-character alphanumeric link code, store it in Redis with a 10-minute TTL,
   * and return the code to be displayed to the user in the web app.
   */
  async generateLinkCode(userId: number): Promise<string> {
    const code = this.randomCode(6)
    const redisKey = `telegram:link:${code}`

    await redis.setex(redisKey, this.LINK_CODE_TTL, String(userId))

    return code
  }

  private randomCode(length: number): string {
    const chars = this.LINK_CODE_CHARS
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  // ─── Raw message sender ───────────────────────────────────────────────────

  /**
   * Send a text message to a Telegram chat.
   * Used by TelegramChannel and internally by bot command handlers.
   */
  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.isConfigured()) {
      console.log(`[TelegramBot] Stub send to chat ${chatId}: ${text}`)
      return
    }

    try {
      await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      })
    } catch (error) {
      console.error(`[TelegramBot] sendMessage to chat ${chatId} failed:`, error)
    }
  }
}

export default new TelegramBotService()
