import { randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import Payment from '#models/payment'
import PaymentAttempt from '#models/payment_attempt'
import Refund from '#models/refund'
import Booking from '#models/booking'
import type { PaymentProvider as PaymentProviderType, PaymentMethod } from '#models/payment'

// ─── Provider Interface ───────────────────────────────────────────────────────

interface InitiatePaymentParams {
  amount: number
  currency: string
  phone?: string
  description: string
  reference: string
  metadata?: Record<string, any>
}

interface ProviderResult {
  success: boolean
  providerTransactionId?: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  message?: string
  rawResponse?: any
}

interface ProviderStatusResult {
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  providerTransactionId?: string
}

interface PaymentProvider {
  name: string
  initiate(params: InitiatePaymentParams): Promise<ProviderResult>
  checkStatus(reference: string): Promise<ProviderStatusResult>
  refund(transactionId: string, amount: number): Promise<ProviderResult>
}

// ─── Provider Stubs ───────────────────────────────────────────────────────────

class MtnMomoProvider implements PaymentProvider {
  name = 'mtn_momo'

  async initiate(_params: InitiatePaymentParams): Promise<ProviderResult> {
    // In production: call MTN MoMo Collections API
    return { success: true, providerTransactionId: `MTN-${Date.now()}`, status: 'processing' }
  }

  async checkStatus(reference: string): Promise<ProviderStatusResult> {
    return { status: 'succeeded', providerTransactionId: reference }
  }

  async refund(_transactionId: string, _amount: number): Promise<ProviderResult> {
    return { success: true, status: 'succeeded' }
  }
}

class OrangeMoneyProvider implements PaymentProvider {
  name = 'orange_money'

  async initiate(_params: InitiatePaymentParams): Promise<ProviderResult> {
    // In production: call Orange Money API
    return { success: true, providerTransactionId: `OM-${Date.now()}`, status: 'processing' }
  }

  async checkStatus(reference: string): Promise<ProviderStatusResult> {
    return { status: 'succeeded', providerTransactionId: reference }
  }

  async refund(_transactionId: string, _amount: number): Promise<ProviderResult> {
    return { success: true, status: 'succeeded' }
  }
}

class AirtelMoneyProvider implements PaymentProvider {
  name = 'airtel_money'

  async initiate(_params: InitiatePaymentParams): Promise<ProviderResult> {
    // In production: call Airtel Money API
    return { success: true, providerTransactionId: `AM-${Date.now()}`, status: 'processing' }
  }

  async checkStatus(reference: string): Promise<ProviderStatusResult> {
    return { status: 'succeeded', providerTransactionId: reference }
  }

  async refund(_transactionId: string, _amount: number): Promise<ProviderResult> {
    return { success: true, status: 'succeeded' }
  }
}

class CashProvider implements PaymentProvider {
  name = 'cash'

  async initiate(_params: InitiatePaymentParams): Promise<ProviderResult> {
    return { success: true, providerTransactionId: `CASH-${Date.now()}`, status: 'succeeded' }
  }

  async checkStatus(reference: string): Promise<ProviderStatusResult> {
    return { status: 'succeeded', providerTransactionId: reference }
  }

  async refund(_transactionId: string, _amount: number): Promise<ProviderResult> {
    return { success: true, status: 'succeeded' }
  }
}

// ─── Reference Generator ─────────────────────────────────────────────────────

function generatePaymentReference(): string {
  const year = new Date().getFullYear()
  const random = randomInt(0, 1_000_000).toString().padStart(6, '0')
  return `PAY-${year}-${random}`
}

function generateRefundReference(): string {
  const year = new Date().getFullYear()
  const random = randomInt(0, 1_000_000).toString().padStart(6, '0')
  return `REF-${year}-${random}`
}

// ─── Payment Service ──────────────────────────────────────────────────────────

export interface InitiatePaymentData {
  bookingId?: number
  userId?: number
  orgId?: number
  provider: string
  method: string
  amount: number
  currency: string
  phone?: string
  description?: string
}

export class PaymentService {
  private providers: Map<string, PaymentProvider>

  constructor() {
    this.providers = new Map<string, PaymentProvider>([
      ['mtn_momo', new MtnMomoProvider()],
      ['orange_money', new OrangeMoneyProvider()],
      ['airtel_money', new AirtelMoneyProvider()],
      ['cash', new CashProvider()],
    ])
  }

  async initiatePayment(data: InitiatePaymentData): Promise<Payment> {
    const provider = this.providers.get(data.provider)
    if (!provider) {
      throw new Error(`Unknown payment provider: ${data.provider}`)
    }

    const internalReference = await this.#generateUniqueRef(
      generatePaymentReference,
      async (ref) => !(await Payment.findBy('internal_reference', ref))
    )

    const externalReference = `${data.provider.toUpperCase()}-${Date.now()}-${randomInt(1000, 9999)}`

    const payment = await Payment.create({
      bookingId: data.bookingId ?? null,
      organizationId: data.orgId ?? null,
      userId: data.userId ?? null,
      reference: externalReference,
      internalReference,
      provider: data.provider as PaymentProviderType,
      method: data.method as PaymentMethod,
      status: 'pending',
      amount: data.amount,
      currency: data.currency,
      phoneNumber: data.phone ?? null,
    })

    const attempt = await PaymentAttempt.create({
      paymentId: payment.id,
      attemptNumber: 1,
      status: 'pending',
    })

    const result = await provider.initiate({
      amount: data.amount,
      currency: data.currency,
      phone: data.phone,
      description: data.description ?? `Payment ${internalReference}`,
      reference: externalReference,
    })

    payment.status = result.status as Payment['status']
    payment.providerTransactionId = result.providerTransactionId ?? null
    if (result.status === 'succeeded') {
      payment.paidAt = DateTime.now()
    }
    await payment.save()

    attempt.status = result.status as PaymentAttempt['status']
    attempt.providerResponse = result.rawResponse ?? null
    if (!result.success) {
      attempt.errorMessage = result.message ?? null
    }
    await attempt.save()

    return payment
  }

  async processWebhook(_provider: string, payload: Record<string, any>): Promise<void> {
    // Idempotent: find payment by provider transaction id or reference
    const transactionId = payload['transactionId'] ?? payload['transaction_id'] ?? null
    const reference = payload['reference'] ?? payload['externalReference'] ?? null

    let payment: Payment | null = null
    if (transactionId) {
      payment = await Payment.findBy('provider_transaction_id', transactionId)
    }
    if (!payment && reference) {
      payment = await Payment.findBy('reference', reference)
    }
    if (!payment) return

    // Avoid reprocessing a terminal state
    if (['succeeded', 'failed', 'cancelled', 'refunded'].includes(payment.status)) return

    const rawStatus = payload['status'] ?? ''
    let newStatus: Payment['status'] = payment.status
    if (['success', 'succeeded', 'completed'].includes(rawStatus)) {
      newStatus = 'succeeded'
    } else if (['failed', 'error'].includes(rawStatus)) {
      newStatus = 'failed'
    } else if (rawStatus === 'processing') {
      newStatus = 'processing'
    }

    payment.status = newStatus
    payment.providerMetadata = payload
    if (newStatus === 'succeeded' && !payment.paidAt) {
      payment.paidAt = DateTime.now()
    }
    if (newStatus === 'failed') {
      payment.failureReason = payload['reason'] ?? payload['message'] ?? null
    }
    await payment.save()

    // Update booking payment status if linked
    if (payment.bookingId && newStatus === 'succeeded') {
      const booking = await Booking.find(payment.bookingId)
      if (booking && booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'paid'
        await booking.save()
      }
    }
  }

  async refundPayment(paymentId: number, reason: string, processedByUserId: number): Promise<Refund> {
    const payment = await Payment.findOrFail(paymentId)

    if (payment.status !== 'succeeded') {
      throw new Error(`Cannot refund a payment with status: ${payment.status}`)
    }

    const existing = await Refund.findBy('payment_id', paymentId)
    if (existing && ['succeeded', 'processing', 'pending'].includes(existing.status)) {
      throw new Error('A refund for this payment already exists')
    }

    const reference = await this.#generateUniqueRef(
      generateRefundReference,
      async (ref) => !(await Refund.findBy('reference', ref))
    )

    const provider = this.providers.get(payment.provider)

    const refund = await Refund.create({
      paymentId: payment.id,
      bookingId: payment.bookingId ?? null,
      reference,
      amount: payment.amount,
      currency: payment.currency,
      reason,
      status: 'processing',
      processedByUserId,
      processedAt: DateTime.now(),
    })

    if (provider && payment.providerTransactionId) {
      const result = await provider.refund(payment.providerTransactionId, payment.amount)
      refund.status = result.success ? 'succeeded' : 'failed'
      refund.providerRefundId = result.providerTransactionId ?? null
      await refund.save()

      if (result.success) {
        payment.status = 'refunded'
        await payment.save()

        if (payment.bookingId) {
          const booking = await Booking.find(payment.bookingId)
          if (booking) {
            booking.paymentStatus = 'refunded'
            await booking.save()
          }
        }
      }
    }

    return refund
  }

  async getPaymentsForBooking(bookingId: number): Promise<Payment[]> {
    return Payment.query().where('booking_id', bookingId).preload('attempts').orderBy('created_at', 'desc')
  }

  async #generateUniqueRef(
    generator: () => string,
    isUnique: (ref: string) => Promise<boolean>,
    attempts = 5
  ): Promise<string> {
    for (let i = 0; i < attempts; i++) {
      const ref = generator()
      if (await isUnique(ref)) return ref
    }
    throw new Error('Failed to generate unique reference')
  }
}
