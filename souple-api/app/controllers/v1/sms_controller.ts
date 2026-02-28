import type { HttpContext } from '@adonisjs/core/http'
import smsService from '#services/sms/sms_service'

export default class SmsController {
  async inbound({ request, response }: HttpContext) {
    const from = request.input('from') || request.input('phoneNumber') || ''
    const body = request.input('text') || request.input('body') || ''

    if (!from || !body) return response.ok({ status: 'ignored' })

    const reply = await smsService.handleInbound(from, body)
    if (reply) {
      // Fire-and-forget reply
      smsService.sendSms(from, reply).catch(console.error)
    }
    return response.ok({ status: 'processed' })
  }

  async deliveryReport({ request, response }: HttpContext) {
    // Log delivery status — provider-specific format, just acknowledge
    console.log('[SMS Delivery]', request.all())
    return response.ok({ status: 'acknowledged' })
  }
}
