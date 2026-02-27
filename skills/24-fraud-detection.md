# Skill 24: Fraud Detection & Prevention

## Objective
Detect and prevent fraudulent activities across the platform: fake bookings, payment fraud, duplicate accounts, fake reviews, and identity fraud. Protect revenue integrity for both the platform and agencies.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 05 (Payments) completed
- Skill 10 (KYC & Security) completed

---

## Scope

### 1. Database Migrations

#### `fraud_signals`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id NULL
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
signal_type           ENUM('duplicate_account', 'suspicious_booking', 'payment_fraud',
                           'fake_review', 'identity_mismatch', 'mass_cancellation',
                           'rate_abuse', 'chargeback', 'velocity_violation')
severity              ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium'
description           TEXT
evidence              JSON                       -- {details, related_ids, metrics}
status                ENUM('detected', 'reviewing', 'confirmed', 'dismissed') DEFAULT 'detected'
action_taken          ENUM('none', 'warning', 'temporary_block', 'permanent_ban', 'reversed') NULL
reviewed_by           BIGINT UNSIGNED FK -> users.id NULL
reviewed_at           TIMESTAMP NULL
review_note           TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(user_id, signal_type)
INDEX(severity, status)
INDEX(created_at)
```

#### `user_risk_scores`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id UNIQUE
risk_score            DECIMAL(3,1) DEFAULT 0     -- 0 (safe) to 10 (high risk)
factors               JSON                       -- {duplicate_signals: 2, chargebacks: 1, ...}
last_calculated_at    TIMESTAMP
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(risk_score)
```

#### `blocked_entities`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
entity_type           ENUM('phone', 'email', 'ip', 'device_fingerprint', 'payment_method')
entity_value          VARCHAR(255)
reason                TEXT
blocked_by            BIGINT UNSIGNED FK -> users.id
expires_at            TIMESTAMP NULL              -- NULL = permanent
created_at            TIMESTAMP
INDEX(entity_type, entity_value)
```

### 2. Fraud Detection Rules

```typescript
// app/services/fraud_detection_service.ts
export class FraudDetectionService {

  /**
   * Rule 1: Duplicate Account Detection
   * Same phone number with different emails, or same device fingerprint
   */
  async checkDuplicateAccount(userId: number): Promise<FraudSignal | null> {
    // Check: same phone on multiple accounts
    // Check: same device fingerprint (from browser)
    // Check: same IP registering multiple accounts in 24h
  }

  /**
   * Rule 2: Booking Velocity
   * Unusual number of bookings in short time (bot behavior)
   */
  async checkBookingVelocity(userId: number): Promise<FraudSignal | null> {
    // Threshold: > 10 bookings in 1 hour
    // Or: > 3 bookings for same trip (seat hoarding)
  }

  /**
   * Rule 3: Mass Cancellation Pattern
   * Book many seats then cancel → blocks seats for legitimate users
   */
  async checkCancellationPattern(userId: number): Promise<FraudSignal | null> {
    // Threshold: > 50% cancellation rate over last 30 days with > 5 bookings
  }

  /**
   * Rule 4: Payment Fraud Indicators
   * Failed payments, chargebacks, use of blocked payment methods
   */
  async checkPaymentFraud(paymentId: number): Promise<FraudSignal | null> {
    // Check: > 3 failed payment attempts in 1 hour
    // Check: payment method on blocked list
    // Check: amount anomaly (way higher than route average)
    // Check: chargeback history
  }

  /**
   * Rule 5: Fake Review Detection
   * Reviews from accounts that didn't actually take the trip, or review bombing
   */
  async checkFakeReview(reviewId: number): Promise<FraudSignal | null> {
    // Check: multiple 1-star reviews from new accounts for same org (coordinated attack)
    // Check: review text copy-pasted across multiple reviews
    // Check: account created within 24h of review
  }

  /**
   * Rule 6: Promotion Abuse
   * Creating multiple accounts to reuse referral codes or coupon codes
   */
  async checkPromotionAbuse(userId: number, promotionId: number): Promise<FraudSignal | null> {
    // Check: same device/IP used multiple promo codes
    // Check: referral loop (A refers B refers A)
  }

  /**
   * Calculate user risk score (0-10)
   */
  async calculateRiskScore(userId: number): Promise<number> {
    // Aggregate all fraud signals for user
    // Weight by severity and recency
    // Factor in: account age, KYC level, booking history, payment success rate
    // Score: 0-3 (low), 3-6 (medium), 6-8 (high), 8-10 (critical)
  }
}
```

### 3. Automated Actions

```typescript
// Based on risk score thresholds:
// Score 0-3:  No action (normal user)
// Score 3-5:  Flag for review, add to watchlist
// Score 5-7:  Require additional verification (OTP on every booking)
// Score 7-9:  Temporary block (24h), notify admin
// Score 9-10: Permanent ban, block associated phone/email/IP
```

### 4. API Endpoints

```
# Admin fraud management
GET    /api/v1/admin/fraud/signals                # All fraud signals (filterable)
PUT    /api/v1/admin/fraud/signals/:id/review     # Review signal (confirm/dismiss)
GET    /api/v1/admin/fraud/risk-scores            # Users by risk score
GET    /api/v1/admin/fraud/blocked                # Blocked entities
POST   /api/v1/admin/fraud/block                  # Block entity (phone/email/IP)
DELETE /api/v1/admin/fraud/blocked/:id            # Unblock entity
GET    /api/v1/admin/fraud/dashboard              # Fraud overview metrics
```

### 5. Frontend Components

- **FraudDashboard** (Admin) — Signal count by type/severity, risk score distribution, recent alerts
- **FraudSignalList** — Filterable list of detected signals with evidence details
- **FraudReviewPanel** — Review signal, view evidence, take action (warn/block/dismiss)
- **UserRiskProfile** — Risk score with breakdown, fraud history, associated accounts
- **BlockedEntityManager** — Manage blocked phones, emails, IPs with expiry

---

## Acceptance Criteria

1. Duplicate accounts detected by phone/device/IP and flagged
2. Booking velocity violations detected and blocked in real-time
3. Mass cancellation patterns flagged for review
4. Payment fraud indicators trigger signals
5. Fake review patterns detected
6. Promotion abuse (multi-account coupon reuse) detected
7. User risk scores calculated and auto-updated
8. Automated actions trigger based on risk score thresholds
9. Admin can review, confirm, or dismiss fraud signals
10. Entities (phone, email, IP) can be blocked/unblocked by admin
11. Fraud dashboard shows trends and metrics

---

## Dependencies
- Skill 01, 05, 10

## Blocks
- None
