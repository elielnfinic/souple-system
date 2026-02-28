import { createHmac, randomUUID } from 'node:crypto'
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
 * MTN MoMo Provider — sandbox-ready MTN Mobile Money Collections API v1.
 *
 * Flow:
 *   1. POST /collection/v1_0/requesttopay  (we supply a UUID as X-Reference-Id)
 *   2. Customer receives USSD prompt on their phone and approves
 *   3. MTN sends a callback (webhook) to our callbackUrl
 *   4. We verify via GET /collection/v1_0/requesttopay/{referenceId}
 *
 * Required env vars (sandbox):
 *   MTN_MOMO_BASE_URL              default: https://sandbox.momodeveloper.mtn.com
 *   MTN_MOMO_SUBSCRIPTION_KEY      Ocp-Apim-Subscription-Key header value
 *   MTN_MOMO_API_KEY               Collections API key (from MTN developer portal)
 *   MTN_MOMO_API_SECRET            Collections API secret
 *   MTN_MOMO_ENVIRONMENT           'sandbox' | 'production'  default: sandbox
 *   MTN_MOMO_WEBHOOK_SECRET        Shared secret for HMAC-SHA256 signature verification
 */
export class MtnMomoProvider implements PaymentProvider {
  name = 'mtn'

  private get baseUrl(): string {
    return env.get('MTN_MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com')
  }

  private get subscriptionKey(): string {
    return env.get('MTN_MOMO_SUBSCRIPTION_KEY', '')
  }

  private get apiKey(): string {
    return env.get('MTN_MOMO_API_KEY', '')
  }

  private get apiSecret(): string {
    return env.get('MTN_MOMO_API_SECRET', '')
  }

  private get momoEnvironment(): string {
    return env.get('MTN_MOMO_ENVIRONMENT', 'sandbox')
  }

  private get webhookSecret(): string {
    return env.get('MTN_MOMO_WEBHOOK_SECRET', '')
  }

  private isConfigured(): boolean {
    return Boolean(this.subscriptionKey && this.apiKey && this.apiSecret)
  }

  /**
   * Obtain a short-lived OAuth access token from the Collections API.
   * Uses HTTP Basic Auth: base64(apiKey:apiSecret)
   */
  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')

    const response = await fetch(`${this.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'X-Target-Environment': this.momoEnvironment,
      },
    })

    if (!response.ok) {
      throw new Error(`MTN MoMo token error: ${response.status} ${await response.text()}`)
    }

    const data = (await response.json()) as { access_token: string }
    return data.access_token
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    if (!this.isConfigured()) {
      console.warn('[MtnMomoProvider] Missing env vars — returning stub pending response')
      return {
        transactionId: `MTN-STUB-${Date.now()}`,
        status: 'pending',
        providerResponse: { stub: true },
      }
    }

    try {
      const referenceId = randomUUID()
      const accessToken = await this.getAccessToken()

      const body = {
        amount: String(params.amount),
        currency: params.currency,
        externalId: params.reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: (params.customerPhone ?? '').replace(/\D/g, ''),
        },
        payerMessage: params.description,
        payeeNote: params.reference,
      }

      const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': this.momoEnvironment,
          'X-Callback-Url': params.callbackUrl,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`MTN MoMo initiate error: ${response.status} ${text}`)
      }

      // MTN returns 202 Accepted — the referenceId we sent IS the transaction ID
      return {
        transactionId: referenceId,
        status: 'pending',
        providerResponse: { referenceId, statusCode: response.status },
      }
    } catch (error) {
      console.error('[MtnMomoProvider] initiate error:', error)
      throw error
    }
  }

  async verify(transactionId: string): Promise<VerifyResult> {
    if (!this.isConfigured()) {
      return { status: 'pending', providerResponse: { stub: true } }
    }

    try {
      const accessToken = await this.getAccessToken()

      const response = await fetch(
        `${this.baseUrl}/collection/v1_0/requesttopay/${transactionId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Target-Environment': this.momoEnvironment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`MTN MoMo verify error: ${response.status} ${await response.text()}`)
      }

      const data = (await response.json()) as { status: string }

      // MTN statuses: SUCCESSFUL, FAILED, PENDING
      let mappedStatus: 'pending' | 'completed' | 'failed'
      if (data.status === 'SUCCESSFUL') {
        mappedStatus = 'completed'
      } else if (data.status === 'FAILED') {
        mappedStatus = 'failed'
      } else {
        mappedStatus = 'pending'
      }

      return { status: mappedStatus, providerResponse: data }
    } catch (error) {
      console.error('[MtnMomoProvider] verify error:', error)
      throw error
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    if (!this.isConfigured()) {
      return {
        refundId: `MTNR-STUB-${Date.now()}`,
        status: 'pending',
        providerResponse: { stub: true },
      }
    }

    try {
      const refundId = randomUUID()
      const accessToken = await this.getAccessToken()

      // MTN MoMo Disbursements API for refunds
      const body = {
        amount: String(amount),
        currency: 'CDF',
        externalId: transactionId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: transactionId, // placeholder — real implementation needs stored phone
        },
        payerMessage: `Refund for transaction ${transactionId}`,
        payeeNote: `Refund`,
      }

      const response = await fetch(`${this.baseUrl}/disbursement/v1_0/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Reference-Id': refundId,
          'X-Target-Environment': this.momoEnvironment,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`MTN MoMo refund error: ${response.status} ${await response.text()}`)
      }

      return {
        refundId,
        status: 'pending',
        providerResponse: { refundId, statusCode: response.status },
      }
    } catch (error) {
      console.error('[MtnMomoProvider] refund error:', error)
      throw error
    }
  }

  /**
   * Verify the X-Callback-Signature header using HMAC-SHA256.
   */
  verifyWebhook(payload: any, signature: string): boolean {
    try {
      if (!this.webhookSecret) return true // skip verification if not configured

      const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
      const expected = createHmac('sha256', this.webhookSecret).update(body).digest('hex')

      return expected === signature
    } catch {
      return false
    }
  }

  parseWebhook(payload: any): WebhookParsed {
    const status = payload?.status === 'SUCCESSFUL' ? 'completed' : 'failed'

    return {
      transactionId: payload?.referenceId ?? payload?.externalId ?? '',
      status,
      amount: Number(payload?.amount ?? 0),
      currency: payload?.currency ?? 'CDF',
      metadata: payload,
    }
  }
}
