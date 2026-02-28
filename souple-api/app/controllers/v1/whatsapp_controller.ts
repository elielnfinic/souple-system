import type { HttpContext } from '@adonisjs/core/http'
import whatsappService from '#services/whatsapp/whatsapp_service'

export default class WhatsAppController {
  // GET /api/v1/whatsapp/webhook — Meta webhook verification
  async verify({ request, response }: HttpContext) {
    const mode = request.input('hub.mode')
    const token = request.input('hub.verify_token')
    const challenge = request.input('hub.challenge')

    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'souple_webhook_token')) {
      return response.ok(Number(challenge))
    }
    return response.forbidden({ error: 'Invalid verify token' })
  }

  // POST /api/v1/whatsapp/webhook — incoming messages
  async webhook({ request, response }: HttpContext) {
    const body = request.body() as any
    // Acknowledge immediately (Meta requires fast 200)
    response.ok({ status: 'ok' })

    // Process asynchronously
    setImmediate(async () => {
      try {
        const entry = body?.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const messages = value?.messages

        if (!messages?.length) return

        for (const msg of messages) {
          if (msg.type === 'text' && msg.text?.body) {
            await whatsappService.handleIncoming(msg.from, msg.text.body)
          }
        }
      } catch (e) {
        console.error('[WhatsApp webhook]', e)
      }
    })
  }
}
