import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
  RefundResult,
  WebhookParsed,
} from '#services/payment/payment_provider'

/**
 * Cash Provider — fully functional, no external calls.
 *
 * Used by ticketers to record walk-in cash payments.
 * Immediately marks the payment as completed — no async flow.
 */
export class CashProvider implements PaymentProvider {
  name = 'cash'

  async initiate(_params: InitiateParams): Promise<InitiateResult> {
    return {
      transactionId: `CASH-${Date.now()}`,
      status: 'completed',
      providerResponse: { method: 'cash', recordedAt: new Date().toISOString() },
    }
  }

  async verify(_transactionId: string): Promise<VerifyResult> {
    return {
      status: 'completed',
      providerResponse: { method: 'cash', note: 'Cash payments are always completed' },
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    return {
      refundId: `CASHR-${Date.now()}`,
      status: 'completed',
      providerResponse: { originalTransactionId: transactionId, refundedAmount: amount },
    }
  }

  verifyWebhook(_payload: any, _signature: string): boolean {
    // Cash provider never sends webhooks — always return true (no-op)
    return true
  }

  parseWebhook(_payload: any): WebhookParsed {
    throw new Error('CashProvider does not support webhooks')
  }
}
