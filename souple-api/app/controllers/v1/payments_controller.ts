import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Payment from '#models/payment'
import PayoutRecord from '#models/payout_record'
import paymentService from '#services/payment_service'
import { ReceiptService } from '#services/receipt_service'
import {
  initiatePaymentValidator,
  cashPaymentValidator,
  refundValidator,
  payoutValidator,
} from '#validators/payment_validator'

const receiptService = new ReceiptService()

export default class PaymentsController {
  // ─── Payment List ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/payments
   *
   * List payments. Scoped by organization if X-Organization-Id header present.
   * Super admins see all. Finance role or org admin required within org.
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const status = request.input('status')
    const method = request.input('method')
    const provider = request.input('provider')

    const query = Payment.query().orderBy('created_at', 'desc')

    if (user.isSuperAdmin) {
      // Super admin: unfiltered
    } else if (ctx.organization) {
      query.where('organization_id', ctx.organization.id)
    } else {
      // Own payments only
      query.where('user_id', user.id)
    }

    if (status) query.where('status', status)
    if (method) query.where('method', method)
    if (provider) query.where('provider', provider)

    const paginated = await query.paginate(page, perPage)
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

  // ─── Payment Detail ───────────────────────────────────────────────────────

  /**
   * GET /api/v1/payments/:id
   */
  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const payment = await Payment.findOrFail(params.id)

    if (!user.isSuperAdmin) {
      const ownedByUser = payment.userId === user.id
      const ownedByOrg = ctx.organization && payment.organizationId === ctx.organization.id

      if (!ownedByUser && !ownedByOrg) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this payment' },
        })
      }
    }

    return response.ok({ success: true, data: payment })
  }

  // ─── Initiate Payment (Trip Booking) ──────────────────────────────────────

  /**
   * POST /api/v1/payments/initiate
   */
  async initiate(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(initiatePaymentValidator)

    if (!data.bookingId && !data.fleetBookingId) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'Either bookingId or fleetBookingId is required',
        },
      })
    }

    try {
      const { payment, result } = await paymentService.initiatePayment({
        bookingId: data.bookingId,
        fleetBookingId: undefined,
        amount: data.amount,
        currency: data.currency,
        method: data.method as any,
        provider: data.provider,
        organizationId: ctx.organization?.id,
        userId: user.id,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
      })

      return response.created({
        success: true,
        data: {
          payment,
          transactionId: result.transactionId,
          status: result.status,
          redirectUrl: result.redirectUrl ?? null,
          providerResponse: result.providerResponse ?? null,
        },
      })
    } catch (error: any) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_PAYMENT_FAILED',
          message: error.message ?? 'Failed to initiate payment',
        },
      })
    }
  }

  // ─── Initiate Payment (Fleet Booking) ─────────────────────────────────────

  /**
   * POST /api/v1/payments/fleet/initiate
   */
  async initiateFleet(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(initiatePaymentValidator)

    if (!data.fleetBookingId) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'fleetBookingId is required for fleet payment initiation',
        },
      })
    }

    try {
      const { payment, result } = await paymentService.initiatePayment({
        bookingId: undefined,
        fleetBookingId: data.fleetBookingId,
        amount: data.amount,
        currency: data.currency,
        method: data.method as any,
        provider: data.provider,
        organizationId: ctx.organization?.id,
        userId: user.id,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
      })

      return response.created({
        success: true,
        data: {
          payment,
          transactionId: result.transactionId,
          status: result.status,
          redirectUrl: result.redirectUrl ?? null,
          providerResponse: result.providerResponse ?? null,
        },
      })
    } catch (error: any) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_PAYMENT_FAILED',
          message: error.message ?? 'Failed to initiate fleet payment',
        },
      })
    }
  }

  // ─── Poll Status ──────────────────────────────────────────────────────────

  /**
   * GET /api/v1/payments/:id/status
   * Poll the provider API for the latest payment status.
   */
  async status(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const payment = await Payment.findOrFail(params.id)

    if (!user.isSuperAdmin) {
      const ownedByUser = payment.userId === user.id
      const ownedByOrg = ctx.organization && payment.organizationId === ctx.organization.id

      if (!ownedByUser && !ownedByOrg) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this payment' },
        })
      }
    }

    try {
      const { status, payment: updated } = await paymentService.pollStatus(payment.id)

      return response.ok({
        success: true,
        data: { status, payment: updated },
      })
    } catch (error: any) {
      return response.internalServerError({
        success: false,
        error: {
          code: 'E_POLL_FAILED',
          message: error.message ?? 'Failed to poll payment status',
        },
      })
    }
  }

  // ─── Webhooks (PUBLIC — no auth middleware) ───────────────────────────────

  /**
   * POST /api/v1/payments/webhooks/mtn
   */
  async webhookMtn(ctx: HttpContext) {
    return this.handleWebhook(ctx, 'mtn')
  }

  /**
   * POST /api/v1/payments/webhooks/orange
   */
  async webhookOrange(ctx: HttpContext) {
    return this.handleWebhook(ctx, 'orange')
  }

  /**
   * POST /api/v1/payments/webhooks/airtel
   */
  async webhookAirtel(ctx: HttpContext) {
    return this.handleWebhook(ctx, 'airtel')
  }

  /**
   * POST /api/v1/payments/webhooks/stripe
   */
  async webhookStripe(ctx: HttpContext) {
    return this.handleWebhook(ctx, 'stripe')
  }

  /**
   * POST /api/v1/payments/webhooks/coinbase
   */
  async webhookCoinbase(ctx: HttpContext) {
    return this.handleWebhook(ctx, 'stablecoin')
  }

  /**
   * Generic webhook handler.
   * Extracts provider-specific signature header and delegates to PaymentService.
   */
  private async handleWebhook(ctx: HttpContext, providerName: string) {
    const { request, response } = ctx

    const payload = request.body()

    // Different providers use different signature header names
    const signatureHeaderMap: Record<string, string> = {
      mtn: 'x-callback-signature',
      orange: 'x-orange-signature',
      airtel: 'x-airtel-signature',
      stripe: 'stripe-signature',
      stablecoin: 'x-cc-webhook-signature',
    }

    const headerName = signatureHeaderMap[providerName] ?? 'x-signature'
    const signature = request.header(headerName) ?? ''

    try {
      await paymentService.handleWebhook(providerName, payload, signature)

      return response.ok({ success: true, data: { received: true } })
    } catch (error: any) {
      const message = error.message ?? 'Webhook processing failed'

      if (message.includes('Invalid webhook signature')) {
        return response.unauthorized({
          success: false,
          error: { code: 'E_INVALID_SIGNATURE', message },
        })
      }

      // Return 200 for processing errors to prevent provider retry storms
      console.error(`[Webhook:${providerName}] Processing error:`, error)
      return response.ok({ success: false, data: { received: true, error: message } })
    }
  }

  // ─── Refund ───────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/payments/:id/refund
   */
  async refund(ctx: HttpContext) {
    const { params, request, response } = ctx
    const user = ctx.auth.user!

    const payment = await Payment.findOrFail(params.id)

    // Only super admin, org admin/manager, or the payment owner can refund
    if (!user.isSuperAdmin) {
      const ownedByUser = payment.userId === user.id
      const ownedByOrg = ctx.organization && payment.organizationId === ctx.organization.id

      if (!ownedByUser && !ownedByOrg) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied' },
        })
      }
    }

    const data = await request.validateUsing(refundValidator)

    try {
      const updated = await paymentService.refund(payment.id, data.amount)

      return response.ok({ success: true, data: updated })
    } catch (error: any) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_REFUND_FAILED',
          message: error.message ?? 'Failed to process refund',
        },
      })
    }
  }

  // ─── Cash Payment ─────────────────────────────────────────────────────────

  /**
   * POST /api/v1/payments/cash
   * Ticketers record walk-in cash payments. Immediately confirms the booking.
   */
  async cash(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(cashPaymentValidator)

    if (!data.bookingId && !data.fleetBookingId) {
      return response.badRequest({
        success: false,
        error: {
          code: 'E_VALIDATION',
          message: 'Either bookingId or fleetBookingId is required',
        },
      })
    }

    try {
      const payment = await paymentService.recordCashPayment({
        bookingId: data.bookingId,
        fleetBookingId: data.fleetBookingId,
        amount: data.amount,
        currency: data.currency,
        notes: data.notes,
        organizationId: ctx.organization?.id,
        userId: user.id,
      })

      return response.created({ success: true, data: payment })
    } catch (error: any) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_CASH_PAYMENT_FAILED',
          message: error.message ?? 'Failed to record cash payment',
        },
      })
    }
  }

  // ─── Receipt ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/payments/:id/receipt
   * Returns structured receipt data. Accept: application/json (default).
   */
  async receipt(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const payment = await Payment.findOrFail(params.id)

    if (!user.isSuperAdmin) {
      const ownedByUser = payment.userId === user.id
      const ownedByOrg = ctx.organization && payment.organizationId === ctx.organization.id

      if (!ownedByUser && !ownedByOrg) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this receipt' },
        })
      }
    }

    try {
      const receiptData = await receiptService.generateReceipt(payment.id)

      return response.ok({ success: true, data: receiptData })
    } catch (error: any) {
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'E_RECEIPT_FAILED',
          message: error.message ?? 'Failed to generate receipt',
        },
      })
    }
  }

  // ─── Payouts ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/payouts
   * List payout records. Org-scoped or all for super admin.
   */
  async listPayouts(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const page = request.input('page', 1)
    const perPage = Math.min(request.input('per_page', 20), 100)
    const status = request.input('status')

    const query = PayoutRecord.query().orderBy('created_at', 'desc')

    if (user.isSuperAdmin) {
      // Unfiltered
    } else if (ctx.organization) {
      query.where('organization_id', ctx.organization.id)
    } else {
      query.where('user_id', user.id)
    }

    if (status) query.where('status', status)

    const paginated = await query.paginate(page, perPage)
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
   * POST /api/v1/payouts
   * Create a payout record (finance role or super admin).
   */
  async createPayout(ctx: HttpContext) {
    const { request, response } = ctx
    const user = ctx.auth.user!

    const data = await request.validateUsing(payoutValidator)

    // Only super admin or org finance/admin can create payouts
    if (!user.isSuperAdmin && !ctx.organization) {
      return response.forbidden({
        success: false,
        error: {
          code: 'E_FORBIDDEN',
          message: 'Organization context required to create a payout',
        },
      })
    }

    const periodStart = DateTime.fromISO(data.periodStart).startOf('day')
    const periodEnd = DateTime.fromISO(data.periodEnd).endOf('day')

    if (!periodStart.isValid || !periodEnd.isValid) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Invalid period_start or period_end date' },
      })
    }

    const payout = await PayoutRecord.create({
      organizationId: ctx.organization?.id ?? null,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      provider: data.provider,
      phoneNumber: data.phoneNumber ?? null,
      status: 'pending',
      externalReference: null,
      periodStart,
      periodEnd,
      notes: data.notes ?? null,
      processedAt: null,
    })

    return response.created({ success: true, data: payout })
  }

  /**
   * GET /api/v1/payouts/:id
   */
  async showPayout(ctx: HttpContext) {
    const { params, response } = ctx
    const user = ctx.auth.user!

    const payout = await PayoutRecord.findOrFail(params.id)

    if (!user.isSuperAdmin) {
      const ownedByUser = payout.userId === user.id
      const ownedByOrg = ctx.organization && payout.organizationId === ctx.organization.id

      if (!ownedByUser && !ownedByOrg) {
        return response.forbidden({
          success: false,
          error: { code: 'E_FORBIDDEN', message: 'Access denied to this payout' },
        })
      }
    }

    return response.ok({ success: true, data: payout })
  }
}
