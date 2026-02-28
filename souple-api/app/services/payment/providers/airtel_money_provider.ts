import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
  RefundResult,
  WebhookParsed,
} from '#services/payment/payment_provider'

/**
 * Airtel Money Provider — stub with correct interface.
 *
 * TODO: Integrate Airtel Money DRC API when credentials available.
 *       Airtel Money uses an API-driven USSD confirmation flow:
 *       1. Initiate with customer's Airtel number
 *       2. Customer receives USSD prompt and approves
 *       3. Airtel sends callback to our webhook URL
 *
 * Required env vars (when implemented):
 *   AIRTEL_MONEY_BASE_URL
 *   AIRTEL_MONEY_CLIENT_ID
 *   AIRTEL_MONEY_CLIENT_SECRET
 *   AIRTEL_MONEY_COUNTRY          e.g., 'CD' for DRC
 *   AIRTEL_MONEY_CURRENCY         e.g., 'CDF'
 *   AIRTEL_MONEY_WEBHOOK_SECRET
 */
export class AirtelMoneyProvider implements PaymentProvider {
  name = 'airtel'

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    // TODO: Integrate Airtel Money DRC API when credentials available
    return {
      transactionId: `AM-${Date.now()}`,
      status: 'pending',
      redirectUrl: `https://airtelmoney.example.com/pay?ref=${params.reference}`,
      providerResponse: { stub: true, reference: params.reference },
    }
  }

  async verify(_transactionId: string): Promise<VerifyResult> {
    // TODO: Integrate Airtel Money DRC API when credentials available
    return {
      status: 'pending',
      providerResponse: { stub: true },
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // TODO: Integrate Airtel Money DRC API when credentials available
    return {
      refundId: `AMR-${Date.now()}`,
      status: 'pending',
      providerResponse: { stub: true, originalTransactionId: transactionId, amount },
    }
  }

  verifyWebhook(_payload: any, _signature: string): boolean {
    // TODO: Implement HMAC verification with AIRTEL_MONEY_WEBHOOK_SECRET
    return true
  }

  parseWebhook(payload: any): WebhookParsed {
    // TODO: Parse actual Airtel Money webhook format
    const status = payload?.transaction?.status === 'TS' ? 'completed' : 'failed'

    return {
      transactionId: payload?.transaction?.id ?? payload?.id ?? '',
      status,
      amount: Number(payload?.transaction?.amount ?? payload?.amount ?? 0),
      currency: payload?.transaction?.currency ?? 'CDF',
      metadata: payload,
    }
  }
}
