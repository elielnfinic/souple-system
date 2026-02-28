import type { HttpContext } from '@adonisjs/core/http'
import ussdService from '#services/ussd/ussd_service'

export default class UssdController {
  async callback({ request, response }: HttpContext) {
    // Africa's Talking sends form data
    const sessionId = request.input('sessionId') || request.input('session_id') || ''
    const phoneNumber = request.input('phoneNumber') || request.input('phone_number') || ''
    const text = request.input('text') || ''

    const result = await ussdService.handleRequest({ sessionId, phoneNumber, text })

    // AT expects plain text: "CON message" or "END message"
    return response
      .header('Content-Type', 'text/plain')
      .ok(`${result.type} ${result.message}`)
  }
}
