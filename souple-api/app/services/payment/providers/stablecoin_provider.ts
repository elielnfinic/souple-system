import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
  RefundResult,
  WebhookParsed,
} from '#services/payment/payment_provider'

/**
 * Stablecoin Provider — stub returning a mock wallet address and transaction ID.
 *
 * TODO: Integrate Coinbase Commerce or NOWPayments for production use.
 *       Supported tokens: USDT, USDC on Ethereum / Polygon / BSC
 *
 * Flow (Coinbase Commerce):
 *   1. Create a charge via POST /charges -> returns a hosted payment URL and addresses
 *   2. Show the address/QR code to the customer with a countdown timer
 *   3. Monitor the blockchain for the incoming transaction
 *   4. Coinbase Commerce sends a webhook (charge:confirmed / charge:failed)
 *
 * Required env vars (when implemented):
 *   COINBASE_COMMERCE_API_KEY
 *   COINBASE_COMMERCE_WEBHOOK_SECRET
 *   NOWPAYMENTS_API_KEY              (alternative provider)
 *   NOWPAYMENTS_IPN_SECRET           (for IPN webhook verification)
 */
export class StablecoinProvider implements PaymentProvider {
  name = 'stablecoin'

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    // TODO: Integrate Coinbase Commerce or NOWPayments
    const cryptoTransactionId = `CRYPTO-${Date.now()}`

    return {
      transactionId: cryptoTransactionId,
      status: 'pending',
      redirectUrl: `https://commerce.coinbase.com/charges/${cryptoTransactionId}`,
      providerResponse: {
        stub: true,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // mock ETH address
        amount: params.amount,
        currency: params.currency,
        reference: params.reference,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
        networks: ['ethereum', 'polygon', 'bsc'],
      },
    }
  }

  async verify(_transactionId: string): Promise<VerifyResult> {
    // TODO: Check on-chain confirmation via Coinbase Commerce or NOWPayments API
    return {
      status: 'pending',
      providerResponse: { stub: true, confirmations: 0, requiredConfirmations: 6 },
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // TODO: Stablecoin refunds require a separate outgoing transfer — integrate with custody solution
    return {
      refundId: `CRYPTOR-${Date.now()}`,
      status: 'pending',
      providerResponse: { stub: true, originalTransactionId: transactionId, amount },
    }
  }

  verifyWebhook(_payload: any, _signature: string): boolean {
    // TODO: Implement HMAC-SHA256 verification using COINBASE_COMMERCE_WEBHOOK_SECRET
    return true
  }

  parseWebhook(payload: any): WebhookParsed {
    // TODO: Parse actual Coinbase Commerce webhook (charge:confirmed / charge:failed)
    const eventType = payload?.event?.type ?? payload?.type ?? ''
    const chargeData = payload?.event?.data ?? payload?.data ?? payload

    const status = eventType === 'charge:confirmed' ? 'completed' : 'failed'

    return {
      transactionId: chargeData?.id ?? chargeData?.code ?? '',
      status,
      amount: Number(chargeData?.pricing?.local?.amount ?? 0),
      currency: chargeData?.pricing?.local?.currency ?? 'USD',
      metadata: chargeData,
    }
  }
}
