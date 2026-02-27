# Skill 13: Business Model & Subscription Billing

## Objective
Implement the hybrid pricing model combining tiered subscriptions (recurring revenue) with transaction-based commissions (marketplace revenue). This skill adds subscription management, billing infrastructure, commission tracking, and the pricing engine that monetizes the platform.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 05 (Payments) completed
- Skill 12 (Marketplace) completed

---

## Pricing Philosophy

**Core principle**: Agencies and drivers make money first, then Souple takes a cut. Low barrier to entry (free tier for independents), value-based upgrades, and transaction commissions that align platform revenue with user success.

**Subscription payments accepted**: Cash, Bank Transfer, Mobile Money (MTN/Orange/Airtel), Stripe (Card), Stablecoin (USDT/USDC).

---

## Revenue Streams

| Revenue Stream               | Target % of Revenue | Description                                                    |
|------------------------------|---------------------|----------------------------------------------------------------|
| Booking commissions (5-10%)  | 50-60%              | Cut on every public marketplace transaction                    |
| Agency SaaS subscriptions    | 20-25%              | Monthly/annual fees for platform access and premium features   |
| Payment processing margin    | 10-15%              | Markup on payment processing (provider charges 2%, we charge 3%) |
| Parcel fees                  | 5-10%               | Per-parcel fee on cargo shipped through the platform           |

---

## Scope

### 1. Subscription Tiers

#### Tier Definitions

| Tier           | Target Users                                  | Price (USD/mo) | Annual Discount |
|----------------|-----------------------------------------------|----------------|-----------------|
| **Basic**      | Independent drivers, small agencies (1-2 vehicles) | Free           | N/A             |
| **Pro**        | Growing agencies/drivers (3-20 vehicles)       | $49-99         | ~20%            |
| **Enterprise** | Large agencies/fleets (20+ vehicles)           | $199-499+      | Custom          |

#### Feature Matrix

| Feature                                     | Basic (Free) | Pro        | Enterprise |
|---------------------------------------------|-------------|------------|------------|
| Signup & vehicle registration               | Yes          | Yes         | Yes         |
| Basic ticketing & parcels                   | Yes          | Yes         | Yes         |
| Offline private use                         | Yes          | Yes         | Yes         |
| Standard role-based dashboards              | Yes          | Yes         | Yes         |
| Email notifications                         | Yes          | Yes         | Yes         |
| Personal dashboard (limited reporting)      | Yes          | Yes         | Yes         |
| Max vehicles                                | 2            | 20          | Unlimited   |
| Max ticketers                               | 1            | 10          | Unlimited   |
| Public marketplace listing                  | No           | Yes         | Yes         |
| Custom seat layouts & pricing (VIP/Economy) | No           | Yes         | Yes         |
| Charter/fleet bookings                      | No           | Yes         | Yes         |
| Multi-channel notifications (Telegram/SMS)  | No           | Yes         | Yes         |
| KYC enforcement options                     | No           | Yes         | Yes         |
| Advanced reporting (turnover, taxes, expenses) | No        | Yes         | Yes         |
| Basic analytics & data visualization        | No           | Yes         | Yes         |
| 3D seat visualizations                      | No           | No          | Yes         |
| Super-admin dashboard (multi-org)           | No           | No          | Yes         |
| Priority integrations (custom GPS/scanners) | No           | No          | Yes         |
| Full audit trails & logging                 | No           | No          | Yes         |
| Dedicated support & API access              | No           | No          | Yes         |
| White-label options                         | No           | No          | Yes         |
| Commission rate on marketplace bookings     | N/A          | 10-15%     | 8-12%       |

#### Add-Ons (A La Carte)

| Add-On                       | Price             |
|------------------------------|-------------------|
| Extra vehicles (Pro, over 10) | $5-10/vehicle/mo |
| Extra users/ticketers        | $10/user/mo       |
| SMS notifications pack       | $0.01-0.05/msg or $20/mo unlimited |
| Telegram notifications       | Included in Pro+  |
| Advanced GPS integrations    | $20-50/mo         |
| Premium reporting exports    | $10/mo            |
| KYC/compliance module        | $15/mo            |
| 3D seat visualization (Pro)  | $10-20/mo         |
| Promoted marketplace listing | $10/mo            |

---

### 2. Database Migrations

#### `subscription_plans`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
name                  VARCHAR(50)             -- 'basic', 'pro', 'enterprise'
display_name          VARCHAR(100)            -- 'Basic', 'Pro', 'Enterprise'
description           TEXT NULL
price_monthly         DECIMAL(12,2)           -- Monthly price in USD
price_annual          DECIMAL(12,2) NULL      -- Annual price (with discount)
currency              VARCHAR(3) DEFAULT 'USD'
max_vehicles          INT NULL                -- NULL = unlimited
max_ticketers         INT NULL
max_users             INT NULL
features              JSON                    -- Feature flags: {"marketplace": true, "custom_layouts": true, ...}
commission_rate       DECIMAL(5,4) NULL       -- e.g., 0.1000 = 10%
is_active             BOOLEAN DEFAULT true
sort_order            INT DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `subscriptions`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id
plan_id               BIGINT UNSIGNED FK -> subscription_plans.id
status                ENUM('active', 'past_due', 'cancelled', 'expired', 'trialing') DEFAULT 'active'
billing_cycle         ENUM('monthly', 'annual') DEFAULT 'monthly'
current_period_start  TIMESTAMP
current_period_end    TIMESTAMP
trial_ends_at         TIMESTAMP NULL
cancelled_at          TIMESTAMP NULL
cancel_reason         TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id)
INDEX(status, current_period_end)
UNIQUE(organization_id)                      -- One active sub per org
```

#### `subscription_payments`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
subscription_id       BIGINT UNSIGNED FK -> subscriptions.id
organization_id       BIGINT UNSIGNED FK -> organizations.id
amount                DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'USD'
method                ENUM('mobile_money', 'card', 'stripe', 'stablecoin', 'cash', 'bank_transfer')
provider              VARCHAR(50) NULL        -- 'mtn', 'orange', 'airtel', 'stripe', 'usdt', 'usdc', 'bank'
status                ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending'
external_transaction_id VARCHAR(255) NULL
provider_response     JSON NULL
phone_number          VARCHAR(20) NULL
bank_reference        VARCHAR(255) NULL       -- For bank transfer confirmations
period_start          TIMESTAMP               -- Billing period this covers
period_end            TIMESTAMP
paid_at               TIMESTAMP NULL
metadata              JSON NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(subscription_id)
INDEX(organization_id, created_at)
INDEX(status)
```

#### `subscription_addons`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
subscription_id       BIGINT UNSIGNED FK -> subscriptions.id
addon_type            VARCHAR(50)             -- 'extra_vehicle', 'extra_user', 'sms_pack', 'gps', etc.
quantity              INT DEFAULT 1
unit_price            DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'USD'
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(subscription_id)
```

#### `commissions`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id
booking_id            BIGINT UNSIGNED FK -> bookings.id NULL
fleet_booking_id      BIGINT UNSIGNED FK -> fleet_bookings.id NULL
parcel_id             BIGINT UNSIGNED FK -> parcels.id NULL
payment_id            BIGINT UNSIGNED FK -> payments.id
transaction_amount    DECIMAL(12,2)           -- Total transaction amount
commission_rate       DECIMAL(5,4)            -- Rate applied (e.g., 0.1000)
commission_amount     DECIMAL(12,2)           -- Souple's cut
platform_fee          DECIMAL(12,2) DEFAULT 0 -- Fixed platform fee if any
payment_processing_fee DECIMAL(12,2) DEFAULT 0 -- Payment provider cost passed through
net_to_provider       DECIMAL(12,2)           -- Amount going to agency/driver
currency              VARCHAR(3)
status                ENUM('pending', 'collected', 'paid_out') DEFAULT 'pending'
collected_at          TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id, created_at)
INDEX(payment_id)
INDEX(status)
```

#### `billing_invoices`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id
subscription_id       BIGINT UNSIGNED FK -> subscriptions.id NULL
invoice_number        VARCHAR(50) UNIQUE      -- 'INV-2026-000001'
type                  ENUM('subscription', 'addon', 'commission_settlement')
amount                DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'USD'
status                ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft'
line_items            JSON                    -- [{description, quantity, unit_price, total}]
due_date              DATE
paid_at               TIMESTAMP NULL
pdf_path              VARCHAR(500) NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id, created_at)
INDEX(status, due_date)
```

---

### 3. API Endpoints

```
# Subscription Plans (public)
GET    /api/v1/plans                             # List available subscription plans
GET    /api/v1/plans/:id                         # Get plan details with feature matrix

# Subscription Management (org owner/manager)
GET    /api/v1/subscriptions/current             # Get current subscription for org
POST   /api/v1/subscriptions                     # Subscribe to a plan
PUT    /api/v1/subscriptions/upgrade             # Upgrade plan (prorate)
PUT    /api/v1/subscriptions/downgrade           # Downgrade plan (end of period)
POST   /api/v1/subscriptions/cancel              # Cancel subscription
POST   /api/v1/subscriptions/reactivate          # Reactivate cancelled subscription

# Subscription Payments
POST   /api/v1/subscriptions/pay                 # Pay subscription (all methods: cash, bank, mobile money, stripe, stablecoin)
GET    /api/v1/subscriptions/payments             # Payment history
GET    /api/v1/subscriptions/payments/:id         # Payment details

# Subscription Payment Webhooks (public, signature-verified)
POST   /api/v1/subscriptions/webhooks/mtn        # MTN MoMo callback for sub payment
POST   /api/v1/subscriptions/webhooks/orange      # Orange Money callback
POST   /api/v1/subscriptions/webhooks/airtel      # Airtel Money callback
POST   /api/v1/subscriptions/webhooks/stripe      # Stripe webhook for sub payment
POST   /api/v1/subscriptions/webhooks/coinbase    # Coinbase Commerce webhook

# Add-Ons
GET    /api/v1/subscriptions/addons               # List current add-ons
POST   /api/v1/subscriptions/addons               # Add an add-on
DELETE /api/v1/subscriptions/addons/:id           # Remove an add-on

# Commissions (finance role / super-admin)
GET    /api/v1/commissions                        # List commissions for org
GET    /api/v1/commissions/summary                # Commission summary (period, totals)

# Billing & Invoices
GET    /api/v1/invoices                           # List invoices for org
GET    /api/v1/invoices/:id                       # Get invoice details
GET    /api/v1/invoices/:id/pdf                   # Download invoice PDF

# Admin: Platform Revenue (super-admin only)
GET    /api/v1/admin/revenue                      # Platform-wide revenue dashboard
GET    /api/v1/admin/revenue/subscriptions         # Subscription revenue breakdown
GET    /api/v1/admin/revenue/commissions           # Commission revenue breakdown
GET    /api/v1/admin/subscriptions                 # All org subscriptions (manage)
PUT    /api/v1/admin/subscriptions/:id            # Admin override subscription
POST   /api/v1/admin/subscription-payments/confirm # Admin confirms cash/bank payment
```

---

### 4. Subscription Service

```typescript
// app/services/subscription_service.ts
export class SubscriptionService {
  async subscribe(orgId: number, planId: number, billingCycle: 'monthly' | 'annual'): Promise<Subscription> {
    // 1. Validate org doesn't already have active subscription (or is on basic)
    // 2. Load plan, calculate price based on billing cycle
    // 3. Create subscription record (status: 'active' or 'trialing')
    // 4. Set current_period_start/end
    // 5. If free tier: immediately active, no payment needed
    // 6. If paid tier: create pending subscription_payment
    // 7. Emit SubscriptionCreated event
    // 8. Apply feature flags to organization
  }

  async upgrade(orgId: number, newPlanId: number): Promise<Subscription> {
    // 1. Load current subscription
    // 2. Calculate prorated amount for remainder of current period
    // 3. Update subscription to new plan
    // 4. Create prorated subscription_payment
    // 5. Immediately apply new feature flags
    // 6. Emit SubscriptionUpgraded event
  }

  async downgrade(orgId: number, newPlanId: number): Promise<Subscription> {
    // 1. Load current subscription
    // 2. Schedule downgrade at end of current period
    // 3. Store pending plan change
    // 4. Features remain until period end
    // 5. Emit SubscriptionDowngradeScheduled event
  }

  async cancel(orgId: number, reason?: string): Promise<Subscription> {
    // 1. Mark subscription as cancelled
    // 2. Access continues until current_period_end
    // 3. After period end: revert to Basic tier
    // 4. Emit SubscriptionCancelled event
  }

  async renewSubscription(subscriptionId: number): Promise<void> {
    // Called by cron job when current_period_end approaches
    // 1. Create new subscription_payment for next period
    // 2. Advance period_start/end
    // 3. If payment fails: set status to 'past_due', send reminders
    // 4. After 7 days past_due with no payment: downgrade to Basic
  }

  async checkFeatureAccess(orgId: number, feature: string): Promise<boolean> {
    // 1. Load org's active subscription + plan
    // 2. Check plan.features JSON for the requested feature
    // 3. Check limits (max_vehicles, max_ticketers, etc.)
    // 4. Return true/false
    // Used by middleware to gate features
  }

  async checkLimits(orgId: number, resource: 'vehicles' | 'ticketers' | 'users'): Promise<{
    current: number
    max: number | null
    canAdd: boolean
  }> {
    // Check current count vs plan limit
    // NULL max = unlimited
  }
}
```

---

### 5. Subscription Payment Service

```typescript
// app/services/subscription_payment_service.ts
export class SubscriptionPaymentService {
  /**
   * Handles subscription payments via ALL methods:
   * cash, bank_transfer, mobile_money, stripe, stablecoin
   */
  async initiatePayment(params: {
    subscriptionId: number
    method: 'mobile_money' | 'card' | 'stripe' | 'stablecoin' | 'cash' | 'bank_transfer'
    provider?: string           // 'mtn', 'orange', 'airtel', 'stripe', 'usdt', 'usdc', 'bank'
    customerPhone?: string
    customerEmail?: string
    bankReference?: string      // For bank transfer confirmation
  }): Promise<SubscriptionPaymentResult> {
    // 1. Load subscription + plan
    // 2. Calculate amount (based on billing cycle + add-ons)
    // 3. Create subscription_payment record (status: pending)
    // 4. Route to appropriate provider (reuse PaymentProvider interface from Skill 05)
    // 5. For cash: requires admin confirmation (POST /admin/subscription-payments/confirm)
    // 6. For bank_transfer: user provides reference, admin confirms receipt
    // 7. For mobile_money/stripe/stablecoin: standard async flow with webhooks
    // 8. On completion: activate/renew subscription
  }

  async confirmCashOrBankPayment(paymentId: number, adminUserId: number): Promise<void> {
    // Admin-only action
    // 1. Load payment, verify it's cash or bank_transfer
    // 2. Mark as completed
    // 3. Record admin who confirmed (audit trail)
    // 4. Activate subscription period
    // 5. Generate invoice
  }

  async handleWebhook(provider: string, payload: any, signature: string): Promise<void> {
    // Same pattern as Skill 05 webhooks but for subscription payments
    // On success: activate subscription, generate invoice
    // On failure: notify org, keep subscription in past_due
  }
}
```

---

### 6. Commission Service

```typescript
// app/services/commission_service.ts
export class CommissionService {
  async calculateCommission(params: {
    organizationId: number
    paymentId: number
    transactionAmount: number
    currency: string
    bookingId?: number
    fleetBookingId?: number
    parcelId?: number
  }): Promise<Commission> {
    // 1. Load org's active subscription plan
    // 2. Get commission_rate from plan (Pro: 10-15%, Enterprise: 8-12%)
    // 3. Calculate: commission_amount = transaction_amount * commission_rate
    // 4. Calculate: payment_processing_fee (actual provider cost)
    // 5. Calculate: net_to_provider = transaction_amount - commission_amount - payment_processing_fee
    // 6. Create commission record
    // 7. Return for payout processing
  }

  async getCommissionSummary(orgId: number, period: DateRange): Promise<CommissionSummary> {
    // Total transactions, total commissions, total net payouts
    // Breakdown by type (booking, fleet, parcel)
    // Breakdown by payment method
  }

  async getPlatformRevenue(period: DateRange): Promise<PlatformRevenue> {
    // Super-admin only
    // Total subscription revenue
    // Total commission revenue
    // Total payment processing margin
    // Revenue by plan tier
    // Revenue by region/city
    // MRR (Monthly Recurring Revenue)
    // Churn rate
  }
}
```

---

### 7. Feature Gate Middleware

```typescript
// app/middleware/feature_gate_middleware.ts
export default class FeatureGateMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { feature: string }) {
    const orgId = ctx.auth.user?.currentOrganizationId

    if (!orgId) {
      throw new ForbiddenException('Organization required')
    }

    const hasAccess = await subscriptionService.checkFeatureAccess(orgId, options.feature)

    if (!hasAccess) {
      throw new ForbiddenException(
        `This feature requires a higher subscription plan. Please upgrade to access "${options.feature}".`,
        { code: 'PLAN_UPGRADE_REQUIRED', feature: options.feature }
      )
    }

    return next()
  }
}

// Usage in routes:
// router.post('/trips/:id/publish', [FeatureGateMiddleware.handle({ feature: 'marketplace' })])
// router.post('/seat-layouts/3d', [FeatureGateMiddleware.handle({ feature: '3d_visualization' })])
```

---

### 8. Commission Middleware (Marketplace Transactions)

```typescript
// app/listeners/apply_commission_listener.ts
// Listens to PaymentCompleted event from Skill 05

export class ApplyCommissionListener {
  async handle(event: PaymentCompleted): Promise<void> {
    const payment = event.payment

    // Only apply commission on marketplace (public) bookings
    if (!payment.bookingId && !payment.fleetBookingId && !payment.parcelId) return

    const booking = await this.loadBooking(payment)
    if (!booking || booking.source !== 'marketplace') return

    // Calculate and record commission
    await commissionService.calculateCommission({
      organizationId: payment.organizationId,
      paymentId: payment.id,
      transactionAmount: payment.amount,
      currency: payment.currency,
      bookingId: payment.bookingId,
      fleetBookingId: payment.fleetBookingId,
    })
  }
}
```

---

### 9. Cron Jobs

```typescript
// Subscription Renewal Check (runs daily at 00:00)
class SubscriptionRenewalJob {
  async handle() {
    // 1. Find subscriptions where current_period_end is within 3 days
    // 2. Send renewal reminder notification
    // 3. Find subscriptions where current_period_end is today
    // 4. Attempt auto-renewal (for card/stripe with saved payment method)
    // 5. For other methods: send payment due notification
  }
}

// Past Due Cleanup (runs daily at 06:00)
class PastDueCleanupJob {
  async handle() {
    // 1. Find subscriptions past_due for > 7 days
    // 2. Downgrade to Basic tier
    // 3. Revoke premium features
    // 4. Send downgrade notification
    // 5. Remove from marketplace if applicable
  }
}

// Commission Settlement (runs weekly on Monday)
class CommissionSettlementJob {
  async handle() {
    // 1. Aggregate pending commissions per org for past week
    // 2. Create settlement invoice
    // 3. Deduct from next payout or charge separately
  }
}

// Invoice Generation (runs on subscription payment completion)
class InvoiceGenerationJob {
  async handle(paymentId: number) {
    // 1. Load payment + subscription + org
    // 2. Generate invoice number (INV-YYYY-NNNNNN)
    // 3. Create line items
    // 4. Generate PDF
    // 5. Store in S3
    // 6. Send via email
  }
}
```

---

### 10. Frontend Components

#### Pricing Page (Public)
- **PricingPage** — Compare plans with feature matrix, toggle monthly/annual
- **PricingCalculator** — "Based on X bookings/mo, you'll pay $Y sub + $Z commissions"
- **PlanComparisonTable** — Side-by-side feature comparison
- **UpgradeTeaser** — In-app banners: "Unlock VIP layouts - Upgrade to Pro!"

#### Subscription Management (Agency Dashboard)
- **SubscriptionOverview** — Current plan, next billing date, usage vs limits
- **PlanSelector** — Choose/upgrade/downgrade plan
- **SubscriptionPaymentForm** — Pay via any method (cash, bank, mobile money, stripe, stablecoin)
  - **MobileMoneySubPayment** — Phone number + provider selector
  - **CardSubPayment** — Stripe Elements
  - **StablecoinSubPayment** — Wallet address + QR code
  - **BankTransferSubPayment** — Show bank details + reference upload
  - **CashSubPayment** — Instructions to visit office / agent confirms
- **PaymentHistory** — List of subscription payments with status
- **AddOnManager** — Add/remove add-ons with pricing
- **UsageMeter** — Visual bars showing vehicles used / max, ticketers used / max

#### Commission Dashboard (Agency)
- **CommissionOverview** — Total commissions this period, breakdown by type
- **CommissionHistory** — Table of all commissions with booking references
- **NetEarningsChart** — Gross bookings vs commissions vs net earnings over time

#### Invoices
- **InvoiceList** — All invoices with status badges (paid, overdue, draft)
- **InvoiceDetail** — Full invoice with line items
- **InvoiceDownload** — PDF download

#### Admin: Platform Revenue (Super-Admin)
- **RevenueOverview** — MRR, total subs, total commissions, churn rate
- **SubscriptionBreakdown** — Pie chart by plan tier
- **CommissionBreakdown** — Revenue by type and region
- **SubscriptionManagement** — List all orgs, their plans, payment status
- **ManualPaymentConfirmation** — Confirm cash/bank subscription payments

---

### 11. Events & Notifications

```typescript
// Events
class SubscriptionCreated { constructor(public subscription: Subscription) {} }
class SubscriptionUpgraded { constructor(public subscription: Subscription, public oldPlan: Plan) {} }
class SubscriptionDowngradeScheduled { constructor(public subscription: Subscription, public newPlan: Plan) {} }
class SubscriptionCancelled { constructor(public subscription: Subscription) {} }
class SubscriptionRenewed { constructor(public subscription: Subscription) {} }
class SubscriptionPastDue { constructor(public subscription: Subscription) {} }
class SubscriptionDowngradedToBasic { constructor(public subscription: Subscription) {} }
class SubscriptionPaymentCompleted { constructor(public payment: SubscriptionPayment) {} }
class SubscriptionPaymentFailed { constructor(public payment: SubscriptionPayment) {} }

// Notifications sent:
// - Welcome to [Plan] — on subscribe
// - Plan upgraded to [Plan] — on upgrade
// - Subscription renewal reminder — 3 days before period end
// - Payment received — on payment completion
// - Payment failed — on payment failure
// - Subscription past due — when payment overdue
// - Downgraded to Basic — after grace period expires
// - Invoice ready — on invoice generation
```

---

### 12. Growth & Monetization Levers

#### Onboarding Incentives
- **14-30 day free trial** on Pro tier for new agencies
- **Referral program**: $50 credit for each new agency signup referred
- **First month discount**: 50% off first month of Pro/Enterprise

#### Upgrade Nudges (In-App)
- Show marketplace earnings potential: "Agencies on Pro earn 3x more through public bookings"
- Feature teasers when Basic users hit limits: "You've reached 2 vehicles. Upgrade to Pro for up to 20."
- Analytics preview: "Upgrade to see demand analysis for your routes"

#### Commission Optimization
- Volume discounts: After $10K/mo in marketplace bookings, commission drops by 2%
- Seasonal promotions: Lower commission during launch/expansion periods
- Loyalty rewards: Commission reduction after 12 months on Pro/Enterprise

---

## Acceptance Criteria

1. Free (Basic) tier works: org can register, add up to 2 vehicles, 1 ticketer, sell tickets privately
2. Pro subscription can be purchased via mobile money, card, stablecoin, bank transfer, and cash
3. Enterprise subscription can be purchased and admin-confirmed (cash/bank)
4. Feature gating works: Basic users see upgrade prompts when accessing Pro features
5. Plan limits enforced: Basic user cannot add 3rd vehicle without upgrading
6. Marketplace commission is automatically calculated on every public booking payment
7. Commission rates match the org's subscription plan tier
8. Subscription auto-renewal reminders sent 3 days before period end
9. Past-due subscriptions downgraded to Basic after 7-day grace period
10. Invoices generated for all subscription payments and downloadable as PDF
11. Admin can confirm cash and bank transfer subscription payments
12. Platform revenue dashboard shows MRR, total subscriptions, commissions, and churn
13. Upgrade/downgrade flows handle proration correctly
14. Payment processing margin is tracked separately from commissions
15. All subscription payment methods work: cash, bank, mobile money, stripe, stablecoin

---

## Dependencies
- Skill 01 (Foundation) — orgs, auth, RBAC
- Skill 05 (Payments) — reuses PaymentProvider interface and providers
- Skill 12 (Marketplace) — commission applies to public marketplace bookings

## Blocks
- None (this is the monetization layer on top of the platform)

## Impacts on Existing Skills
- **Skill 03 (Fleet)**: Vehicle creation must check subscription limits (max_vehicles)
- **Skill 04 (Booking)**: Public bookings must be gated behind Pro+ subscription
- **Skill 05 (Payments)**: PaymentCompleted event listener triggers commission calculation
- **Skill 06 (Notifications)**: New notification types for subscription events
- **Skill 09 (Dashboards)**: Add commission and subscription widgets
- **Skill 12 (Marketplace)**: Only Pro+ orgs can list on public marketplace
