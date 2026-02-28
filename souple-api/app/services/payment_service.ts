import { DateTime } from 'luxon'
import env from '#start/env'
import Payment from '#models/payment'
import PaymentTransaction from '#models/payment_transaction'
import Booking from '#models/booking'
import FleetBooking from '#models/fleet_booking'
import type { PaymentMethod, PaymentStatus } from '#models/payment'
import type { PaymentProvider, InitiateResult } from '#services/payment/payment_provider'
import { CashProvider } from '#services/payment/providers/cash_provider'
import { MtnMomoProvider } from '#services/payment/providers/mtn_momo_provider'
import { OrangeMoneyProvider } from '#services/payment/providers/orange_money_provider'
import { AirtelMoneyProvider } from '#services/payment/providers/airtel_money_provider'
import { StripeProvider } from '#services/payment/providers/stripe_provider'
import { StablecoinProvider } from '#services/payment/providers/stablecoin_provider'

// ─── Params & Results ────────────────────────────────────────────────────────

export interface InitiatePaymentParams {
  bookingId?: number
  fleetBookingId?: number
  amount: number
  currency: string
  method: PaymentMethod
  provider: string
  organizationId?: number
  userId?: number
  customerPhone?: string
  customerEmail?: string
}

export interface InitiatePaymentResult {
  payment: Payment
  result: InitiateResult
}

export interface CashPaymentParams {
  bookingId?: number
  fleetBookingId?: number
  amount: number
  currency: string
  notes?: string
  organizationId?: number
  userId?: number
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class PaymentService {
  private providers: Map<string, PaymentProvider>

  constructor() {
    this.providers = new Map([
      ['mtn', new MtnMomoProvider()],
      ['orange', new OrangeMoneyProvider()],
      ['airtel', new AirtelMoneyProvider()],
      ['stripe', new StripeProvider()],
      ['stablecoin', new StablecoinProvider()],
      ['cash', new CashProvider()],
    ])
  }

  /**
   * Resolve a provider by name. Throws if unknown.
   */
  getProvider(name: string): PaymentProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Unknown payment provider: ${name}`)
    }
    return provider
  }

  /**
   * Build the webhook callback URL for a given provider.
   */
  private buildCallbackUrl(providerName: string): string {
    const appUrl = env.get('APP_URL', 'http://localhost:3333')
    return `${appUrl}/api/v1/payments/webhooks/${providerName}`
  }

  /**
   * Initiate a payment for a booking or fleet booking.
   *
   * Steps:
   *   1. Create Payment record (status: pending)
   *   2. Resolve provider and call initiate()
   *   3. Create PaymentTransaction (type: charge, status: pending)
   *   4. If result.status === 'completed' (cash): confirm the booking immediately
   *   5. Update Payment with externalTransactionId and providerResponse
   *   6. Return payment + provider result
   */
  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    // Determine booking reference for description
    let reference = `REF-${Date.now()}`
    if (params.bookingId) {
      const booking = await Booking.find(params.bookingId)
      if (booking) reference = booking.bookingCode
    } else if (params.fleetBookingId) {
      const fleetBooking = await FleetBooking.find(params.fleetBookingId)
      if (fleetBooking) reference = fleetBooking.bookingCode
    }

    // 1. Create Payment record
    const payment = await Payment.create({
      bookingId: params.bookingId ?? null,
      fleetBookingId: params.fleetBookingId ?? null,
      organizationId: params.organizationId ?? null,
      userId: params.userId ?? null,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      provider: params.provider,
      status: 'pending',
      externalTransactionId: null,
      providerResponse: null,
      phoneNumber: params.customerPhone ?? null,
      paidAt: null,
      refundedAt: null,
      refundAmount: null,
      metadata: { initiatedAt: DateTime.utc().toISO() },
    })

    try {
      // 2. Call provider
      const provider = this.getProvider(params.provider)

      const result = await provider.initiate({
        amount: params.amount,
        currency: params.currency,
        reference,
        description: `Payment for booking ${reference}`,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        callbackUrl: this.buildCallbackUrl(params.provider),
      })

      // 3. Create PaymentTransaction audit entry
      await PaymentTransaction.create({
        paymentId: payment.id,
        type: 'charge',
        amount: params.amount,
        currency: params.currency,
        status: result.status === 'completed' ? 'success' : 'pending',
        providerReference: result.transactionId,
        rawResponse: result.providerResponse,
        errorMessage: null,
      })

      // 4. Update Payment with provider data
      payment.externalTransactionId = result.transactionId
      payment.providerResponse = result.providerResponse

      if (result.status === 'completed') {
        payment.status = 'completed'
        payment.paidAt = DateTime.utc()
        await payment.save()
        // Confirm the associated booking immediately (cash path)
        await this.confirmBooking(payment)
      } else {
        await payment.save()
      }

      return { payment, result }
    } catch (error) {
      // Mark payment as failed on provider error
      payment.status = 'failed'
      payment.metadata = { ...(payment.metadata ?? {}), error: String(error) }
      await payment.save()

      await PaymentTransaction.create({
        paymentId: payment.id,
        type: 'charge',
        amount: params.amount,
        currency: params.currency,
        status: 'failed',
        providerReference: null,
        rawResponse: null,
        errorMessage: String(error),
      })

      throw error
    }
  }

  /**
   * Record a cash payment (ticketer flow).
   * Cash is always immediately completed — no async flow.
   */
  async recordCashPayment(params: CashPaymentParams): Promise<Payment> {
    const result = await this.initiatePayment({
      bookingId: params.bookingId,
      fleetBookingId: params.fleetBookingId,
      amount: params.amount,
      currency: params.currency,
      method: 'cash',
      provider: 'cash',
      organizationId: params.organizationId,
      userId: params.userId,
    })

    if (params.notes) {
      result.payment.metadata = { ...(result.payment.metadata ?? {}), notes: params.notes }
      await result.payment.save()
    }

    return result.payment
  }

  /**
   * Handle an incoming webhook from a payment provider.
   *
   * Steps:
   *   1. Verify signature (throws if invalid)
   *   2. Parse webhook to standard format
   *   3. Find Payment by external_transaction_id (idempotent — if not found, log and return)
   *   4. Create PaymentTransaction record
   *   5. Update Payment status
   *   6. If completed: set paid_at, confirm booking
   *   7. If failed: log (seat release is handled by booking expiry job)
   */
  async handleWebhook(providerName: string, payload: any, signature: string): Promise<void> {
    const provider = this.getProvider(providerName)

    // 1. Verify signature
    const isValid = provider.verifyWebhook(payload, signature)
    if (!isValid) {
      throw new Error(`Invalid webhook signature from provider: ${providerName}`)
    }

    // 2. Parse to standard format
    let parsed
    try {
      parsed = provider.parseWebhook(payload)
    } catch (parseError) {
      console.error(`[PaymentService] Failed to parse webhook from ${providerName}:`, parseError)
      return
    }

    // 3. Find the Payment record
    const payment = await Payment.query()
      .where('external_transaction_id', parsed.transactionId)
      .first()

    if (!payment) {
      console.warn(
        `[PaymentService] Webhook received for unknown transactionId: ${parsed.transactionId} (provider: ${providerName}) — ignoring`
      )
      return
    }

    // Idempotency: already processed
    if (payment.status === 'completed' || payment.status === 'refunded') {
      console.info(
        `[PaymentService] Webhook duplicate — payment ${payment.id} already in status: ${payment.status}`
      )
      return
    }

    // 4. Create PaymentTransaction audit entry
    await PaymentTransaction.create({
      paymentId: payment.id,
      type: 'charge',
      amount: parsed.amount > 0 ? parsed.amount : payment.amount,
      currency: parsed.currency || payment.currency,
      status: parsed.status === 'completed' ? 'success' : 'failed',
      providerReference: parsed.transactionId,
      rawResponse: payload,
      errorMessage: parsed.status === 'failed' ? 'Provider reported failure' : null,
    })

    // 5. Update Payment status
    if (parsed.status === 'completed') {
      payment.status = 'completed'
      payment.paidAt = DateTime.utc()
      payment.providerResponse = { ...(payment.providerResponse ?? {}), webhookPayload: payload }
      await payment.save()

      // 6. Confirm the associated booking
      await this.confirmBooking(payment)
      console.info(`[PaymentService] Payment ${payment.id} completed via webhook`)
    } else {
      payment.status = 'failed'
      payment.providerResponse = { ...(payment.providerResponse ?? {}), webhookPayload: payload }
      await payment.save()
      console.info(
        `[PaymentService] Payment ${payment.id} failed via webhook — seat release handled by expiry job`
      )
    }
  }

  /**
   * Process a refund for a completed payment.
   *
   * Steps:
   *   1. Load payment, validate status === 'completed'
   *   2. Compute refund amount (full if not specified, capped at original)
   *   3. Call provider.refund()
   *   4. Create PaymentTransaction (type: refund)
   *   5. Update Payment: status = 'refunded'|'partially_refunded', refunded_at, refund_amount
   */
  async refund(paymentId: number, amount?: number): Promise<Payment> {
    const payment = await Payment.findOrFail(paymentId)

    if (payment.status !== 'completed') {
      throw new Error(
        `E_INVALID_STATUS: Payment must be 'completed' to refund (current: ${payment.status})`
      )
    }

    const refundAmount = amount !== undefined ? amount : payment.amount

    if (refundAmount <= 0) {
      throw new Error('E_INVALID_AMOUNT: Refund amount must be greater than zero')
    }

    if (refundAmount > payment.amount) {
      throw new Error(
        `E_INVALID_AMOUNT: Refund amount (${refundAmount}) exceeds original payment (${payment.amount})`
      )
    }

    const provider = this.getProvider(payment.provider ?? 'cash')

    let refundResult
    try {
      refundResult = await provider.refund(payment.externalTransactionId ?? '', refundAmount)
    } catch (error) {
      await PaymentTransaction.create({
        paymentId: payment.id,
        type: 'refund',
        amount: refundAmount,
        currency: payment.currency,
        status: 'failed',
        providerReference: null,
        rawResponse: null,
        errorMessage: String(error),
      })
      throw error
    }

    // 4. Create refund transaction
    await PaymentTransaction.create({
      paymentId: payment.id,
      type: 'refund',
      amount: refundAmount,
      currency: payment.currency,
      status: refundResult.status === 'completed' ? 'success' : 'pending',
      providerReference: refundResult.refundId,
      rawResponse: refundResult.providerResponse,
      errorMessage: null,
    })

    // 5. Update Payment
    const isFullRefund = refundAmount >= payment.amount
    payment.status = isFullRefund ? 'refunded' : 'partially_refunded'
    payment.refundAmount = refundAmount
    payment.refundedAt = DateTime.utc()
    await payment.save()

    return payment
  }

  /**
   * Poll payment status from the provider API and update locally if changed.
   */
  async pollStatus(paymentId: number): Promise<{ status: string; payment: Payment }> {
    const payment = await Payment.findOrFail(paymentId)

    // Already in a terminal state — no need to poll
    if (
      payment.status === 'completed' ||
      payment.status === 'failed' ||
      payment.status === 'refunded' ||
      payment.status === 'partially_refunded'
    ) {
      return { status: payment.status, payment }
    }

    if (!payment.externalTransactionId) {
      return { status: payment.status, payment }
    }

    const provider = this.getProvider(payment.provider ?? 'cash')

    try {
      const verifyResult = await provider.verify(payment.externalTransactionId)

      if (verifyResult.status === 'completed' && payment.status !== 'completed') {
        payment.status = 'completed'
        payment.paidAt = DateTime.utc()
        payment.providerResponse = {
          ...(payment.providerResponse ?? {}),
          polledResponse: verifyResult.providerResponse,
        }
        await payment.save()

        await PaymentTransaction.create({
          paymentId: payment.id,
          type: 'charge',
          amount: payment.amount,
          currency: payment.currency,
          status: 'success',
          providerReference: payment.externalTransactionId,
          rawResponse: verifyResult.providerResponse,
          errorMessage: null,
        })

        await this.confirmBooking(payment)
      } else if (verifyResult.status === 'failed' && payment.status !== 'failed') {
        payment.status = 'failed'
        payment.providerResponse = {
          ...(payment.providerResponse ?? {}),
          polledResponse: verifyResult.providerResponse,
        }
        await payment.save()

        await PaymentTransaction.create({
          paymentId: payment.id,
          type: 'charge',
          amount: payment.amount,
          currency: payment.currency,
          status: 'failed',
          providerReference: payment.externalTransactionId,
          rawResponse: verifyResult.providerResponse,
          errorMessage: 'Provider returned failed status on poll',
        })
      }
    } catch (error) {
      console.error(`[PaymentService] pollStatus error for payment ${paymentId}:`, error)
      // Don't throw — polling is a non-critical background operation
    }

    return { status: payment.status, payment }
  }

  /**
   * Confirm the booking (or fleet booking) linked to a completed payment.
   * Safe to call multiple times — only updates if booking is not already confirmed.
   */
  private async confirmBooking(payment: Payment): Promise<void> {
    if (payment.bookingId) {
      try {
        const booking = await Booking.find(payment.bookingId)
        if (booking && booking.status === 'pending') {
          booking.status = 'confirmed'
          await booking.save()
          console.info(
            `[PaymentService] Booking ${booking.id} confirmed via payment ${payment.id}`
          )
        }
      } catch (error) {
        console.error(
          `[PaymentService] Failed to confirm booking ${payment.bookingId}:`,
          error
        )
      }
    }

    if (payment.fleetBookingId) {
      try {
        const fleetBooking = await FleetBooking.find(payment.fleetBookingId)
        if (fleetBooking && fleetBooking.status === 'pending') {
          fleetBooking.status = 'confirmed'
          await fleetBooking.save()
          console.info(
            `[PaymentService] FleetBooking ${fleetBooking.id} confirmed via payment ${payment.id}`
          )
        }
      } catch (error) {
        console.error(
          `[PaymentService] Failed to confirm fleet booking ${payment.fleetBookingId}:`,
          error
        )
      }
    }
  }
}

export default new PaymentService()
