import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
  RefundResult,
  WebhookParsed,
} from '#services/payment/payment_provider'

/**
 * Orange Money Provider — stub with correct interface.
 *
 * TODO: Integrate Orange Money DRC API when credentials available.
 *       Orange Money DRC uses a USSD-based confirmation flow:
 *       1. Initiate -> Customer receives USSD prompt
 *       2. Customer approves on phone
 *       3. Orange Money sends callback to our webhook
 *
 * Required env vars (when implemented):
 *   ORANGE_MONEY_BASE_URL
 *   ORANGE_MONEY_CLIENT_ID
 *   ORANGE_MONEY_CLIENT_SECRET
 *   ORANGE_MONEY_MERCHANT_KEY
 *   ORANGE_MONEY_WEBHOOK_SECRET
 */
export class OrangeMoneyProvider implements PaymentProvider {
  name = 'orange'

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    // TODO: Integrate Orange Money DRC API when credentials available
    return {
      transactionId: `OM-${Date.now()}`,
      status: 'pending',
      redirectUrl: `https://orangemoney.example.com/pay?ref=${params.reference}`,
      providerResponse: { stub: true, reference: params.reference },
    }
  }

  async verify(_transactionId: string): Promise<VerifyResult> {
    // TODO: Integrate Orange Money DRC API when credentials available
    return {
      status: 'pending',
      providerResponse: { stub: true },
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // TODO: Integrate Orange Money DRC API when credentials available
    return {
      refundId: `OMR-${Date.now()}`,
      status: 'pending',
      providerResponse: { stub: true, originalTransactionId: transactionId, amount },
    }
  }

  verifyWebhook(_payload: any, _signature: string): boolean {
    // TODO: Implement HMAC verification with ORANGE_MONEY_WEBHOOK_SECRET
    return true
  }

  parseWebhook(payload: any): WebhookParsed {
    // TODO: Parse actual Orange Money webhook format
    const status = payload?.status === 'SUCCESS' ? 'completed' : 'failed'

    return {
      transactionId: payload?.transaction_id ?? payload?.txnId ?? '',
      status,
      amount: Number(payload?.amount ?? 0),
      currency: payload?.currency ?? 'CDF',
      metadata: payload,
    }
  }
}
