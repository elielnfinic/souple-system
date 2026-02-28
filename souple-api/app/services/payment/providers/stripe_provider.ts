import env from '#start/env'
import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
  RefundResult,
  WebhookParsed,
} from '#services/payment/payment_provider'

/**
 * Stripe Provider — real Stripe Payment Intents integration.
 *
 * Flow (card payment with 3DS):
 *   1. Server creates a PaymentIntent -> returns client_secret
 *   2. Client uses Stripe.js to collect card details and confirm the intent
 *   3. Stripe sends a webhook (payment_intent.succeeded / payment_intent.payment_failed)
 *   4. We update Payment status accordingly
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET    whsec_... (from Stripe Dashboard > Webhooks)
 *
 * Degrades gracefully to stub behavior if STRIPE_SECRET_KEY is not set.
 */
export class StripeProvider implements PaymentProvider {
  name = 'stripe'

  private get secretKey(): string {
    return env.get('STRIPE_SECRET_KEY', '')
  }

  private get webhookSecret(): string {
    return env.get('STRIPE_WEBHOOK_SECRET', '')
  }

  private isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'))
  }

  /**
   * Lazy-load the Stripe SDK to avoid crashing on startup when key is not set.
   */
  private async getStripe() {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY in .env')
    }

    // Dynamic import so the module resolves at runtime (avoids compile-time dep issues)
    const { default: Stripe } = await import('stripe')
    return new Stripe(this.secretKey, { apiVersion: '2024-06-20' })
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    if (!this.isConfigured()) {
      console.warn('[StripeProvider] STRIPE_SECRET_KEY not set — returning stub')
      return {
        transactionId: `pi_stub_${Date.now()}`,
        status: 'pending',
        providerResponse: { stub: true, clientSecret: 'pi_stub_secret' },
      }
    }

    try {
      const stripe = await this.getStripe()

      const paymentIntent = await stripe.paymentIntents.create({
        // Stripe requires amount in smallest currency unit (cents for USD, 0-decimal for CDF)
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        description: params.description,
        metadata: {
          reference: params.reference,
          callbackUrl: params.callbackUrl,
        },
        receipt_email: params.customerEmail ?? undefined,
      })

      return {
        transactionId: paymentIntent.id,
        status: 'pending',
        // redirectUrl is undefined — client confirms via Stripe.js using client_secret
        providerResponse: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status,
        },
      }
    } catch (error) {
      console.error('[StripeProvider] initiate error:', error)
      throw error
    }
  }

  async verify(transactionId: string): Promise<VerifyResult> {
    if (!this.isConfigured()) {
      return { status: 'pending', providerResponse: { stub: true } }
    }

    try {
      const stripe = await this.getStripe()
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId)

      let mappedStatus: 'pending' | 'completed' | 'failed'
      if (paymentIntent.status === 'succeeded') {
        mappedStatus = 'completed'
      } else if (
        paymentIntent.status === 'requires_payment_method' ||
        paymentIntent.status === 'canceled'
      ) {
        mappedStatus = 'failed'
      } else {
        mappedStatus = 'pending'
      }

      return { status: mappedStatus, providerResponse: { status: paymentIntent.status } }
    } catch (error) {
      console.error('[StripeProvider] verify error:', error)
      throw error
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    if (!this.isConfigured()) {
      return {
        refundId: `re_stub_${Date.now()}`,
        status: 'pending',
        providerResponse: { stub: true },
      }
    }

    try {
      const stripe = await this.getStripe()

      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100), // smallest currency unit
      })

      let mappedStatus: 'pending' | 'completed' | 'failed'
      if (refund.status === 'succeeded') {
        mappedStatus = 'completed'
      } else if (refund.status === 'failed') {
        mappedStatus = 'failed'
      } else {
        mappedStatus = 'pending'
      }

      return {
        refundId: refund.id,
        status: mappedStatus,
        providerResponse: { refundId: refund.id, status: refund.status },
      }
    } catch (error) {
      console.error('[StripeProvider] refund error:', error)
      throw error
    }
  }

  /**
   * Verify a Stripe webhook using stripe.webhooks.constructEvent.
   * signature = the value of the Stripe-Signature header.
   */
  verifyWebhook(payload: any, signature: string): boolean {
    if (!this.isConfigured() || !this.webhookSecret) {
      console.warn('[StripeProvider] Webhook verification skipped — not configured')
      return true
    }

    try {
      // We need the raw body string for Stripe signature verification
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload)

      // Synchronous — Stripe SDK validates locally using HMAC
      const { createHmac } = require('node:crypto')

      // Parse the Stripe-Signature header
      const parts = Object.fromEntries(
        signature.split(',').map((part) => {
          const [key, ...rest] = part.split('=')
          return [key, rest.join('=')]
        })
      )

      const timestamp = parts['t']
      const receivedSig = parts['v1']

      if (!timestamp || !receivedSig) return false

      const signedPayload = `${timestamp}.${body}`
      const expectedSig = createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex')

      return expectedSig === receivedSig
    } catch {
      return false
    }
  }

  parseWebhook(payload: any): WebhookParsed {
    const event = payload as { type: string; data: { object: any } }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      return {
        transactionId: pi.id,
        status: 'completed',
        amount: pi.amount / 100, // convert from cents
        currency: (pi.currency ?? 'usd').toUpperCase(),
        metadata: pi.metadata,
      }
    }

    if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const pi = event.data.object
      return {
        transactionId: pi.id,
        status: 'failed',
        amount: pi.amount / 100,
        currency: (pi.currency ?? 'usd').toUpperCase(),
        metadata: pi.metadata,
      }
    }

    throw new Error(`[StripeProvider] Unhandled webhook event type: ${event.type}`)
  }
}
