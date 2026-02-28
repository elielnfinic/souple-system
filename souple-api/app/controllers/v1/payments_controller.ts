import type { HttpContext } from '@adonisjs/core/http'
import { PaymentService } from '#services/payment_service'
import Payment from '#models/payment'
import type User from '#models/user'

const paymentService = new PaymentService()

export default class PaymentsController {
  /**
   * GET /api/v1/payments
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const paginated = await Payment.query()
      .where('user_id', user.id)
      .preload('attempts')
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

    const json = paginated.toJSON()
    return response.ok({
      success: true,
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    })
  }

  /**
   * GET /api/v1/payments/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user! as User
    const payment = await Payment.query()
      .where('id', Number(params.id))
      .preload('attempts')
      .preload('refund')
      .firstOrFail()

    if (!user.isSuperAdmin && payment.userId !== user.id) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Not authorized to view this payment' },
      })
    }

    return response.ok({ success: true, data: payment })
  }

  /**
   * POST /api/v1/payments
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const { provider, method, amount, currency, phone, description, booking_id: bookingId } = body

    if (!provider || !method || !amount || !currency) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'provider, method, amount, and currency are required' },
      })
    }

    const payment = await paymentService.initiatePayment({
      bookingId: bookingId ? Number(bookingId) : undefined,
      userId: user.id,
      provider: String(provider),
      method: String(method),
      amount: Number(amount),
      currency: String(currency),
      phone: phone ? String(phone) : undefined,
      description: description ? String(description) : undefined,
    })

    return response.created({ success: true, data: payment })
  }

  /**
   * POST /api/v1/payments/webhook/:provider — public, no auth
   */
  async webhook({ params, request, response }: HttpContext) {
    const payload = request.body() as Record<string, any>
    const provider = params.provider as string

    await paymentService.processWebhook(provider, payload)

    return response.ok({ success: true })
  }

  /**
   * POST /api/v1/payments/:id/refund — admin only
   */
  async refund({ auth, params, request, response }: HttpContext) {
    const user = auth.user! as User

    if (!user.isSuperAdmin) {
      return response.forbidden({
        success: false,
        error: { code: 'E_FORBIDDEN', message: 'Only admins can initiate refunds' },
      })
    }

    const reason = request.input('reason', 'Refund requested by admin')
    const refund = await paymentService.refundPayment(Number(params.id), String(reason), user.id)

    return response.created({ success: true, data: refund })
  }
}
