# Skill 15: Promotions, Coupons & Loyalty Program

## Objective
Build a flexible promotion engine supporting coupon codes, time-based discounts, loyalty points, referral rewards, and agency-managed promotions. Drive user acquisition and retention through incentives aligned with the marketplace model.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 05 (Payments) completed
- Skill 13 (Business Model) completed

---

## Scope

### 1. Database Migrations

#### `promotions`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL  -- NULL = platform-wide
code                  VARCHAR(50) UNIQUE NULL     -- Coupon code (NULL for auto-applied promos)
name                  VARCHAR(200)
description           TEXT NULL
type                  ENUM('percentage', 'fixed_amount', 'free_seat', 'buy_x_get_y')
discount_value        DECIMAL(12,2) NULL         -- Percentage (0-100) or fixed amount
discount_currency     VARCHAR(3) NULL            -- For fixed_amount type
min_order_amount      DECIMAL(12,2) NULL         -- Minimum booking amount to qualify
max_discount_amount   DECIMAL(12,2) NULL         -- Cap on percentage discounts
max_uses_total        INT NULL                   -- NULL = unlimited
max_uses_per_user     INT DEFAULT 1
current_uses          INT DEFAULT 0
applicable_routes     JSON NULL                  -- Route IDs, NULL = all routes
applicable_seat_classes JSON NULL                -- Seat class IDs, NULL = all
starts_at             TIMESTAMP
expires_at            TIMESTAMP NULL              -- NULL = no expiry
is_active             BOOLEAN DEFAULT true
is_public             BOOLEAN DEFAULT false       -- Show on marketplace or require code
conditions            JSON NULL                  -- Extra conditions: {"first_booking": true, "min_passengers": 2}
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(code)
INDEX(organization_id, is_active)
INDEX(starts_at, expires_at)
```

#### `promotion_uses`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
promotion_id          BIGINT UNSIGNED FK -> promotions.id
user_id               BIGINT UNSIGNED FK -> users.id
booking_id            BIGINT UNSIGNED FK -> bookings.id
discount_applied      DECIMAL(12,2)
currency              VARCHAR(3)
created_at            TIMESTAMP
INDEX(promotion_id, user_id)
INDEX(booking_id)
```

#### `loyalty_accounts`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id UNIQUE
points_balance        INT DEFAULT 0
lifetime_points       INT DEFAULT 0
tier                  ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze'
tier_updated_at       TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `loyalty_transactions`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
loyalty_account_id    BIGINT UNSIGNED FK -> loyalty_accounts.id
type                  ENUM('earn', 'redeem', 'expire', 'bonus', 'adjustment')
points                INT                        -- Positive for earn, negative for redeem
description           VARCHAR(255)
reference_type        VARCHAR(50) NULL            -- 'booking', 'referral', 'promotion'
reference_id          BIGINT UNSIGNED NULL
expires_at            TIMESTAMP NULL              -- Points expiry
created_at            TIMESTAMP
INDEX(loyalty_account_id, created_at)
```

#### `referrals`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
referrer_user_id      BIGINT UNSIGNED FK -> users.id
referred_user_id      BIGINT UNSIGNED FK -> users.id NULL  -- NULL until signup
referral_code         VARCHAR(20) UNIQUE
status                ENUM('pending', 'signed_up', 'first_booking', 'rewarded') DEFAULT 'pending'
referrer_reward_type  ENUM('points', 'credit', 'discount') DEFAULT 'credit'
referrer_reward_value DECIMAL(12,2)
referred_reward_type  ENUM('points', 'credit', 'discount') DEFAULT 'discount'
referred_reward_value DECIMAL(12,2)
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(referrer_user_id)
INDEX(referral_code)
```

### 2. Promotion Engine

```typescript
// app/services/promotion_service.ts
export class PromotionService {
  async validateCode(code: string, params: {
    userId: number
    routeId: number
    seatClassId?: number
    amount: number
    currency: string
    passengerCount: number
  }): Promise<PromotionValidation> {
    // 1. Find promotion by code
    // 2. Check: is_active, within date range, not expired
    // 3. Check: max_uses_total not exceeded
    // 4. Check: max_uses_per_user not exceeded for this user
    // 5. Check: min_order_amount met
    // 6. Check: applicable_routes (if set)
    // 7. Check: applicable_seat_classes (if set)
    // 8. Check: conditions (first_booking, min_passengers, etc.)
    // 9. Calculate discount amount
    // 10. Apply max_discount_amount cap
    // 11. Return: { valid, discount, newTotal, message }
  }

  async applyPromotion(promotionId: number, bookingId: number, userId: number): Promise<void> {
    // 1. Re-validate (prevent race conditions)
    // 2. Create promotion_use record
    // 3. Increment current_uses
    // 4. Apply discount to booking total
  }

  async getAutoApplicablePromotions(params: {
    userId: number
    routeId: number
    amount: number
  }): Promise<Promotion[]> {
    // Find promotions where code IS NULL and is_public = true
    // That match the user's context
    // Show these as "available discounts" in the booking flow
  }
}
```

### 3. Loyalty Service

```typescript
// app/services/loyalty_service.ts
export class LoyaltyService {
  // Points earning rates
  static POINTS_PER_CDF = 0.01     // 1 point per 100 FC spent
  static POINTS_PER_USD = 10       // 10 points per $1 spent

  // Tier thresholds (lifetime points)
  static TIERS = {
    bronze:   0,
    silver:   1000,
    gold:     5000,
    platinum: 20000,
  }

  // Tier multipliers
  static TIER_MULTIPLIERS = {
    bronze:   1.0,
    silver:   1.25,
    gold:     1.5,
    platinum: 2.0,
  }

  async earnPoints(userId: number, bookingId: number, amount: number, currency: string): Promise<void> {
    // 1. Calculate base points from amount
    // 2. Apply tier multiplier
    // 3. Create loyalty_transaction (type: earn)
    // 4. Update points_balance and lifetime_points
    // 5. Check tier upgrade
  }

  async redeemPoints(userId: number, points: number, bookingId: number): Promise<{ discount: number, currency: string }> {
    // 1. Check balance >= points
    // 2. Convert points to discount (100 points = 1000 FC or $1)
    // 3. Create loyalty_transaction (type: redeem)
    // 4. Deduct from balance
    // 5. Apply discount to booking
  }

  async getReferralCode(userId: number): Promise<string> {
    // Generate unique referral code for user
    // Format: REF-{username or random}-{short hash}
  }

  async processReferral(referralCode: string, newUserId: number): Promise<void> {
    // 1. Find referral by code
    // 2. Link referred_user_id
    // 3. Give referred user their reward (e.g., first booking discount)
    // 4. On referred user's first completed booking:
    //    - Give referrer their reward (credit or points)
    //    - Update referral status to 'rewarded'
  }
}
```

### 4. API Endpoints

```
# Promotions (coupon validation)
POST   /api/v1/promotions/validate              # Validate coupon code for booking
GET    /api/v1/promotions/available              # Get auto-applicable promotions for context

# Agency promotion management
GET    /api/v1/org/promotions                    # List org's promotions
POST   /api/v1/org/promotions                    # Create promotion
PUT    /api/v1/org/promotions/:id                # Update promotion
DELETE /api/v1/org/promotions/:id                # Deactivate promotion
GET    /api/v1/org/promotions/:id/stats          # Usage stats for promotion

# Platform promotions (super-admin)
GET    /api/v1/admin/promotions                  # All platform promotions
POST   /api/v1/admin/promotions                  # Create platform-wide promotion

# Loyalty
GET    /api/v1/loyalty/account                   # My loyalty account (balance, tier)
GET    /api/v1/loyalty/transactions               # My points history
POST   /api/v1/loyalty/redeem                     # Redeem points at booking

# Referrals
GET    /api/v1/referrals/code                     # Get my referral code + link
GET    /api/v1/referrals                          # My referral history
POST   /api/v1/referrals/apply                    # Apply referral code at signup
```

### 5. Frontend Components

- **CouponInput** — Input field in booking flow with "Apply" button, shows discount or error inline
- **AvailablePromotions** — Banner/list of auto-applicable deals in search results
- **LoyaltyDashboard** — Points balance, tier progress bar, transaction history, redeem section
- **ReferralCard** — Share referral code/link, see referral status
- **PromotionManager** (Agency) — CRUD promotions with date pickers, route selectors, usage stats
- **PromotionBanner** (Marketplace) — Highlighted deals on homepage and search results

---

## Acceptance Criteria

1. Coupon codes can be created, validated, and applied to bookings
2. Percentage and fixed-amount discounts calculate correctly
3. Promotion limits enforced (max uses total, max per user, date range, min amount)
4. Route-specific and seat-class-specific promotions work
5. Auto-applicable promotions shown to eligible users in booking flow
6. Loyalty points earned on every completed booking
7. Tier upgrades trigger automatically based on lifetime points
8. Points can be redeemed for booking discounts
9. Referral codes generate, track signups, and reward both parties after first booking
10. Agencies can create and manage their own promotions
11. Platform-wide promotions manageable by super-admin

---

## Dependencies
- Skill 01, 04, 05
- Skill 13 (Business Model) — promotions interact with commission calculations

## Blocks
- None
