# Skill 14: Multi-Currency & Exchange Rates

## Objective
Implement proper multi-currency support for the DRC market where CDF (Franc Congolais) and USD coexist daily. Handle exchange rate management, currency display preferences, rate locking at booking time, and settlement in different currencies.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 05 (Payments) completed
- Skill 02 (UI Design System) — currency formatting per locale

---

## Context

In DRC, prices are often quoted in both CDF and USD. A bus ticket might cost 45,000 FC or $15. Exchange rates fluctuate, and agencies often set their own rates. The platform must handle:
- Prices set in one currency, displayed in another
- Payment in a different currency than the listed price
- Rate locking so the price at booking time is honored
- Settlement/payouts in the agency's preferred currency

---

## Scope

### 1. Database Migrations

#### `currencies`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
code                  VARCHAR(3) UNIQUE           -- 'CDF', 'USD', 'EUR'
name                  VARCHAR(100)                -- 'Franc Congolais', 'US Dollar'
symbol                VARCHAR(10)                 -- 'FC', '$', '€'
symbol_position       ENUM('before', 'after') DEFAULT 'after'  -- FC after, $ before
decimal_places        TINYINT DEFAULT 2           -- CDF: 0, USD: 2
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `exchange_rates`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
from_currency         VARCHAR(3)
to_currency           VARCHAR(3)
rate                  DECIMAL(18,8)               -- e.g., 1 USD = 2750.00000000 CDF
source                ENUM('manual', 'api', 'central_bank') DEFAULT 'manual'
set_by_user_id        BIGINT UNSIGNED FK NULL     -- For manual rates
effective_from        TIMESTAMP
effective_until       TIMESTAMP NULL               -- NULL = current rate
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
INDEX(from_currency, to_currency, effective_from)
UNIQUE(from_currency, to_currency, effective_from)
```

#### `booking_exchange_rates` (rate lock)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_id            BIGINT UNSIGNED FK -> bookings.id
from_currency         VARCHAR(3)
to_currency           VARCHAR(3)
locked_rate           DECIMAL(18,8)               -- Rate at time of booking
locked_at             TIMESTAMP
created_at            TIMESTAMP
INDEX(booking_id)
```

#### Additions to existing tables
```
-- organizations: add preferred currency
ALTER TABLE organizations ADD COLUMN preferred_currency VARCHAR(3) DEFAULT 'CDF';
ALTER TABLE organizations ADD COLUMN display_both_currencies BOOLEAN DEFAULT true;

-- users: add preferred currency for display
ALTER TABLE users ADD COLUMN preferred_currency VARCHAR(3) DEFAULT 'CDF';

-- price_rules: already has currency, ensure it's used properly
-- payments: already has currency field
```

### 2. Exchange Rate Service

```typescript
// app/services/exchange_rate_service.ts
export class ExchangeRateService {
  async getCurrentRate(from: string, to: string): Promise<number> {
    // 1. Check Redis cache first (TTL: 5 min)
    // 2. Query latest active rate from DB
    // 3. If not found, try inverse (to→from) and invert
    // 4. Cache in Redis
    // 5. Throw if no rate available
  }

  async convert(amount: number, from: string, to: string): Promise<{
    amount: number
    rate: number
    fromCurrency: string
    toCurrency: string
  }> {
    if (from === to) return { amount, rate: 1, fromCurrency: from, toCurrency: to }
    const rate = await this.getCurrentRate(from, to)
    return {
      amount: this.roundForCurrency(amount * rate, to),
      rate,
      fromCurrency: from,
      toCurrency: to,
    }
  }

  async lockRateForBooking(bookingId: number, from: string, to: string): Promise<number> {
    // Lock the current rate at booking time
    // This rate will be honored for the payment
    const rate = await this.getCurrentRate(from, to)
    await BookingExchangeRate.create({
      bookingId, fromCurrency: from, toCurrency: to, lockedRate: rate, lockedAt: DateTime.now()
    })
    return rate
  }

  async setRate(from: string, to: string, rate: number, userId: number): Promise<void> {
    // Admin sets manual exchange rate
    // Deactivate previous rate
    // Create new rate
    // Clear Redis cache
    // Audit log
  }

  private roundForCurrency(amount: number, currency: string): number {
    // CDF: round to nearest integer (no decimals)
    // USD: round to 2 decimal places
    // EUR: round to 2 decimal places
  }
}
```

### 3. Price Display Service

```typescript
// lib/price-display.ts (frontend utility)
/**
 * Format a price for display based on user preferences and org settings.
 * If org displays both currencies, show: "45 000 FC (~$16)"
 */
export function formatPrice(
  amount: number,
  currency: string,
  options?: {
    showBothCurrencies?: boolean
    secondaryCurrency?: string
    exchangeRate?: number
    locale?: string
  }
): string {
  // Primary: format in original currency using Skill 02 formatCurrency()
  // If showBothCurrencies and exchangeRate provided:
  //   Convert and show secondary in parentheses
  //   "45 000 FC (~$16)" or "$16.00 (~45 000 FC)"
}
```

### 4. API Endpoints

```
# Exchange rates (public read)
GET    /api/v1/exchange-rates                    # Current rates
GET    /api/v1/exchange-rates/convert            # Convert amount: ?from=CDF&to=USD&amount=45000

# Exchange rate management (super-admin)
POST   /api/v1/admin/exchange-rates              # Set new rate
GET    /api/v1/admin/exchange-rates/history       # Rate history

# User/Org preferences
PUT    /api/v1/users/me/currency                 # Set preferred display currency
PUT    /api/v1/org/settings/currency             # Set org preferred currency
```

### 5. Frontend Components

- **CurrencyToggle** — Small toggle in header/footer to switch display currency (CDF/USD)
- **PriceDisplay** — Shows price in primary currency + optional secondary: "45 000 FC (~$16)"
- **ExchangeRateAdmin** — Admin panel to view/set rates, rate history chart
- **CurrencySelector** — Dropdown for user/org currency preference in settings

---

## Acceptance Criteria

1. Prices display correctly in CDF (no decimals, "FC" after) and USD (2 decimals, "$" before)
2. Users can set preferred display currency and see prices converted
3. Organizations can set their preferred currency and choose to display both
4. Exchange rates can be set manually by admin
5. Rate is locked at booking time — payment uses the locked rate
6. Currency conversion is accurate and consistent across the platform
7. API returns prices with currency code, frontend handles formatting per locale
8. CDF/USD dual display works: "45 000 FC (~$16)" format
9. Redis caching prevents excessive DB queries for rate lookups
10. Rate history viewable by admin

---

## Dependencies
- Skill 01 (Foundation)
- Skill 05 (Payments)
- Skill 02 (UI Design System) — currency formatting per locale

## Blocks
- Skill 16 (USSD) — USSD price display uses this
- Skill 15 (Promotions) — discount calculations respect currency
