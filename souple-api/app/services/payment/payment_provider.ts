/**
 * Payment Provider Interface — Skill 05
 *
 * All providers implement this interface, enabling the PaymentService orchestrator
 * to swap providers without changing any business logic.
 */

export interface InitiateParams {
  amount: number
  currency: string
  reference: string       // Booking code
  description: string
  customerPhone?: string
  customerEmail?: string
  callbackUrl: string
  returnUrl?: string
}

export interface InitiateResult {
  transactionId: string
  status: 'pending' | 'redirect' | 'completed'
  redirectUrl?: string
  providerResponse?: any
}

export interface VerifyResult {
  status: 'pending' | 'completed' | 'failed'
  providerResponse: any
}

export interface RefundResult {
  refundId: string
  status: 'pending' | 'completed' | 'failed'
  providerResponse: any
}

export interface WebhookParsed {
  transactionId: string
  status: 'completed' | 'failed'
  amount: number
  currency: string
  metadata?: any
}

export interface PaymentProvider {
  name: string

  /**
   * Initiate a payment. Returns redirect URL or pending/completed status.
   */
  initiate(params: InitiateParams): Promise<InitiateResult>

  /**
   * Check payment status with the provider.
   */
  verify(transactionId: string): Promise<VerifyResult>

  /**
   * Process a refund.
   */
  refund(transactionId: string, amount: number): Promise<RefundResult>

  /**
   * Verify that a webhook came from the real provider (signature check).
   */
  verifyWebhook(payload: any, signature: string): boolean

  /**
   * Parse a raw webhook payload into the standard format.
   */
  parseWebhook(payload: any): WebhookParsed
}
