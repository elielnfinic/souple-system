# Skill 05: Payment Integration

## Objective
Implement a flexible, provider-agnostic payment system supporting mobile money (MTN, Orange, Airtel), card payments (Stripe/Visa), stablecoins (USDT/USDC), and cash. Includes webhook handling, receipt generation, and refund flow.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Payment provider API credentials (sandbox/test accounts)

---

## Scope

### 1. Database Migrations

#### `payments`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_id            BIGINT UNSIGNED FK -> bookings.id NULL
fleet_booking_id      BIGINT UNSIGNED FK -> fleet_bookings.id NULL
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
user_id               BIGINT UNSIGNED FK -> users.id NULL
amount                DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'CDF'
method                ENUM('mobile_money', 'card', 'stripe', 'stablecoin', 'cash')
provider              VARCHAR(50) NULL        -- 'mtn', 'orange', 'airtel', 'stripe', 'usdt', 'usdc'
status                ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending'
external_transaction_id VARCHAR(255) NULL
provider_response     JSON NULL
phone_number          VARCHAR(20) NULL        -- For mobile money
paid_at               TIMESTAMP NULL
refunded_at           TIMESTAMP NULL
refund_amount         DECIMAL(12,2) NULL
metadata              JSON NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(booking_id)
INDEX(fleet_booking_id)
INDEX(status)
INDEX(external_transaction_id)
INDEX(organization_id, created_at)
```

#### `payment_transactions`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
payment_id            BIGINT UNSIGNED FK -> payments.id
type                  ENUM('charge', 'refund', 'payout')
amount                DECIMAL(12,2)
currency              VARCHAR(3)
status                ENUM('pending', 'success', 'failed')
provider_reference    VARCHAR(255) NULL
raw_response          JSON NULL
error_message         TEXT NULL
created_at            TIMESTAMP
INDEX(payment_id)
```

#### `payout_records` (for driver/agency payouts)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
user_id               BIGINT UNSIGNED FK -> users.id           -- Driver or agency owner
amount                DECIMAL(12,2)
currency              VARCHAR(3)
method                VARCHAR(50)
provider              VARCHAR(50)
phone_number          VARCHAR(20) NULL
status                ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending'
external_reference    VARCHAR(255) NULL
period_start          DATE
period_end            DATE
notes                 TEXT NULL
processed_at          TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id, period_start)
INDEX(user_id, period_start)
```

---

### 2. API Endpoints

```
# Payment initiation
POST   /api/v1/payments/initiate              # Initiate payment for booking
POST   /api/v1/payments/fleet/initiate        # Initiate payment for fleet booking

# Payment status
GET    /api/v1/payments/:id                   # Get payment details
GET    /api/v1/payments/:id/status            # Poll payment status (for async methods)

# Webhooks (public, no auth, signature-verified)
POST   /api/v1/payments/webhooks/mtn          # MTN MoMo callback
POST   /api/v1/payments/webhooks/orange       # Orange Money callback
POST   /api/v1/payments/webhooks/airtel       # Airtel Money callback
POST   /api/v1/payments/webhooks/stripe       # Stripe webhook
POST   /api/v1/payments/webhooks/coinbase     # Coinbase Commerce webhook

# Refunds
POST   /api/v1/payments/:id/refund            # Initiate refund

# Cash payments (ticketer records)
POST   /api/v1/payments/cash                  # Record cash payment

# Receipts
GET    /api/v1/payments/:id/receipt            # Get receipt (HTML/PDF)

# Payouts (finance role)
GET    /api/v1/payouts                         # List payouts
POST   /api/v1/payouts                         # Create payout
GET    /api/v1/payouts/:id                     # Get payout details

# Payment history
GET    /api/v1/payments                        # List payments (filtered, org-scoped)
```

---

### 3. Payment Provider Architecture

#### Provider Interface
```typescript
// app/services/payment/payment_provider.ts
export interface PaymentProvider {
  name: string

  /**
   * Initiate a payment. Returns redirect URL or pending status.
   */
  initiate(params: {
    amount: number
    currency: string
    reference: string        // Booking code
    description: string
    customerPhone?: string
    customerEmail?: string
    callbackUrl: string
    returnUrl?: string
  }): Promise<{
    transactionId: string
    status: 'pending' | 'redirect' | 'completed'
    redirectUrl?: string
    providerResponse?: any
  }>

  /**
   * Check payment status
   */
  verify(transactionId: string): Promise<{
    status: 'pending' | 'completed' | 'failed'
    providerResponse: any
  }>

  /**
   * Process a refund
   */
  refund(transactionId: string, amount: number): Promise<{
    refundId: string
    status: 'pending' | 'completed' | 'failed'
    providerResponse: any
  }>

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: any, signature: string): boolean

  /**
   * Parse webhook to standard format
   */
  parseWebhook(payload: any): {
    transactionId: string
    status: 'completed' | 'failed'
    amount: number
    currency: string
    metadata?: any
  }
}
```

#### Provider Implementations

**MTN Mobile Money (MoMo API)**
```typescript
// app/services/payment/providers/mtn_momo_provider.ts
export class MtnMomoProvider implements PaymentProvider {
  name = 'mtn'
  // Uses MTN MoMo API v1 (Collections API)
  // Flow: Request to Pay -> Customer confirms on phone -> Callback
  // Sandbox URL: https://sandbox.momodeveloper.mtn.com
  // Prod URL: https://proxy.momoapi.mtn.com
}
```

**Orange Money**
```typescript
// app/services/payment/providers/orange_money_provider.ts
export class OrangeMoneyProvider implements PaymentProvider {
  name = 'orange'
  // Uses Orange Money Payment API
  // Flow: Initiate -> Customer USSD confirmation -> Callback
}
```

**Airtel Money**
```typescript
// app/services/payment/providers/airtel_money_provider.ts
export class AirtelMoneyProvider implements PaymentProvider {
  name = 'airtel'
  // Uses Airtel Money API
  // Flow: Initiate -> Customer confirmation -> Callback
}
```

**Stripe (Cards)**
```typescript
// app/services/payment/providers/stripe_provider.ts
export class StripeProvider implements PaymentProvider {
  name = 'stripe'
  // Uses Stripe Payment Intents API
  // Flow: Create PaymentIntent -> Client-side confirmation -> Webhook
  // Supports Visa, Mastercard, etc.
}
```

**Stablecoin (via Coinbase Commerce or NOWPayments)**
```typescript
// app/services/payment/providers/stablecoin_provider.ts
export class StablecoinProvider implements PaymentProvider {
  name = 'stablecoin'
  // Uses Coinbase Commerce API or NOWPayments API
  // Supports: USDT, USDC on Ethereum/Polygon/BSC
  // Flow: Create charge -> Show payment address/QR -> Monitor blockchain -> Webhook
}
```

**Cash (Internal)**
```typescript
// app/services/payment/providers/cash_provider.ts
export class CashProvider implements PaymentProvider {
  name = 'cash'
  // No external integration
  // Ticketer records cash payment manually
  // Immediately marked as 'completed'
}
```

---

### 4. Payment Orchestrator Service

```typescript
// app/services/payment_service.ts
export class PaymentService {
  private providers: Map<string, PaymentProvider>

  constructor() {
    this.providers = new Map()
    this.providers.set('mtn', new MtnMomoProvider())
    this.providers.set('orange', new OrangeMoneyProvider())
    this.providers.set('airtel', new AirtelMoneyProvider())
    this.providers.set('stripe', new StripeProvider())
    this.providers.set('stablecoin', new StablecoinProvider())
    this.providers.set('cash', new CashProvider())
  }

  async initiatePayment(params: {
    bookingId?: number
    fleetBookingId?: number
    amount: number
    currency: string
    method: PaymentMethod
    provider: string
    userId?: number
    organizationId?: number
    customerPhone?: string
    customerEmail?: string
  }): Promise<PaymentInitiateResult> {
    // 1. Create Payment record (status: pending)
    // 2. Resolve provider
    // 3. Call provider.initiate()
    // 4. Create PaymentTransaction record
    // 5. If cash: immediately mark completed, confirm booking
    // 6. Return result (redirect URL or pending status)
  }

  async handleWebhook(providerName: string, payload: any, signature: string): Promise<void> {
    // 1. Verify webhook signature
    // 2. Parse webhook to standard format
    // 3. Find Payment by transactionId
    // 4. Update Payment status
    // 5. Create PaymentTransaction record
    // 6. If completed:
    //    - Emit PaymentCompleted event
    //    - Confirm booking (update status to 'confirmed')
    //    - Dispatch receipt notification job
    // 7. If failed:
    //    - Emit PaymentFailed event
    //    - Release reserved seats
  }

  async refund(paymentId: number, amount?: number): Promise<RefundResult> {
    // 1. Load payment
    // 2. Validate: payment is completed, amount <= paid amount
    // 3. Call provider.refund()
    // 4. Create PaymentTransaction (type: refund)
    // 5. Update Payment status
    // 6. Emit PaymentRefunded event
  }

  async recordCashPayment(params: CashPaymentParams): Promise<Payment> {
    // Used by ticketers for walk-in cash payments
    // Immediately creates a completed payment
    // Confirms the associated booking
  }

  async pollStatus(paymentId: number): Promise<PaymentStatus> {
    // For frontend polling of async payment methods
    // Checks both local DB and provider API
  }
}
```

---

### 5. Receipt Generation

```typescript
// app/services/receipt_service.ts
export class ReceiptService {
  async generateReceipt(paymentId: number): Promise<ReceiptData> {
    // Load payment + booking + trip + org
    // Return structured receipt data:
    // { receipt_number, date, org_name, org_logo, passenger, route,
    //   seats, amounts, payment_method, payment_ref, qr_code }
  }

  async generateReceiptPdf(paymentId: number): Promise<Buffer> {
    // Generate PDF using pdfmake
  }

  async sendReceipt(paymentId: number): Promise<void> {
    // Dispatch to notification system (Skill 06):
    // - Email with PDF attachment
    // - SMS with summary text
    // - Telegram with formatted message
  }
}
```

---

### 6. Frontend Components

#### Payment Form (Booking Flow)
- **PaymentMethodSelector** — Choose method: Mobile Money / Card / Crypto / Cash
- **MobileMoneyForm** — Phone number input, provider selector (MTN/Orange/Airtel), submit
- **CardPaymentForm** — Stripe Elements integration for card input
- **StablecoinPayment** — Show payment address + QR code, amount, countdown timer
- **CashPaymentConfirm** — Ticketer confirms cash received
- **PaymentStatusPoller** — Polls payment status, shows spinner/success/failure
- **PaymentReceipt** — Displays receipt with download/share/print options

#### Payment History (Dashboard)
- **PaymentList** — Filterable table of payments with status badges
- **PaymentDetail** — Full payment info with transaction history
- **RefundForm** — Initiate refund with amount input

#### Payout Management (Finance Dashboard)
- **PayoutList** — List of payouts to drivers/agencies
- **PayoutForm** — Create payout (select user, amount, method)

---

### 7. Events & Jobs

```typescript
// Events
class PaymentCompleted {
  constructor(public payment: Payment) {}
}
// Listeners: ConfirmBooking, SendReceipt, UpdateFinancials

class PaymentFailed {
  constructor(public payment: Payment) {}
}
// Listeners: ReleaseSeats, NotifyUser

class PaymentRefunded {
  constructor(public payment: Payment, public refundAmount: number) {}
}
// Listeners: UpdateBookingStatus, NotifyUser, UpdateFinancials

// Jobs
class ProcessPaymentWebhookJob {
  async handle(payload: WebhookPayload) { ... }
}

class SendReceiptJob {
  async handle(paymentId: number) { ... }
}

class CheckPendingPaymentsJob {
  // Cron job: check payments stuck in 'pending' for > 30 min
  // Poll provider API to get actual status
  // Clean up expired reservations
}
```

---

## Acceptance Criteria

1. User can pay for a booking via mobile money (test with sandbox)
2. User can pay via Stripe (test mode card payment)
3. Cash payment recorded by ticketer immediately confirms booking
4. Payment webhooks correctly update payment and booking status
5. Failed payment releases reserved seats
6. Receipt is generated with correct amounts and sent via email
7. Refund flow works (full and partial)
8. Payment status polling works for async methods
9. Stablecoin payment shows wallet address and detects payment
10. All payments are logged with provider transaction IDs
11. Concurrent payment attempts for same booking are handled (no double charge)
12. Finance dashboard shows payment history filtered by org

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking)

## Blocks
- Skill 06 (Notifications) — for receipt delivery
- Skill 09 (Dashboards) — for finance reporting
