import type { HttpContext } from '@adonisjs/core/http'
import { UssdService } from '#services/ussd_service'

export default class UssdController {
  /**
   * POST /api/v1/ussd/callback
   * Public endpoint for telecom provider webhook
   */
  async callback({ request, response }: HttpContext) {
    const sessionId = request.input('sessionId') || request.input('session_id', '')
    const phone = request.input('phoneNumber') || request.input('phone', '')
    const text = request.input('text', '')

    const service = new UssdService()
    const result = await service.handleRequest(sessionId, phone, text)

    return response.ok(result)
  }
}
