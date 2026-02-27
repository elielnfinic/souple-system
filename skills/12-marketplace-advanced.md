# Skill 12: Marketplace & Advanced Features

## Objective
Build the public-facing marketplace where passengers can discover and book trips from multiple agencies and independent drivers. Includes rating system, driver self-registration, advanced analytics, and API documentation for third-party integrations.

## Prerequisites
- Skills 01-05 completed (core platform functional)
- Skill 09 (Dashboards) completed
- Skill 10 (KYC) completed

---

## Scope

### 1. Public Marketplace

The marketplace is the public-facing portal where anyone can search and book transport across all agencies and drivers that have set `visibility: 'public'` on their vehicles.

#### API Endpoints
```
# Public search (no auth required)
GET    /api/v1/marketplace/search              # Search trips across all public providers
GET    /api/v1/marketplace/routes/popular       # Most popular routes
GET    /api/v1/marketplace/providers             # List public agencies/drivers
GET    /api/v1/marketplace/providers/:id         # Provider profile (agency/driver)
GET    /api/v1/marketplace/providers/:id/trips   # Trips by provider
GET    /api/v1/marketplace/providers/:id/reviews # Reviews for provider

# Fleet rental marketplace
GET    /api/v1/marketplace/rentals              # Available vehicles for rental
GET    /api/v1/marketplace/rentals/search       # Search by type, date, location

# Ratings & reviews (authenticated)
POST   /api/v1/reviews                          # Submit review (after trip completed)
GET    /api/v1/reviews                          # My reviews
PUT    /api/v1/reviews/:id                      # Edit review
DELETE /api/v1/reviews/:id                      # Delete review
```

#### Marketplace Search Service
```typescript
// app/services/marketplace_service.ts
export class MarketplaceService {
  async search(params: {
    fromCityId: number
    toCityId: number
    date: DateTime
    passengers: number
    seatClass?: string
    sortBy?: 'price' | 'departure' | 'rating' | 'duration'
    priceMin?: number
    priceMax?: number
    features?: string[]          // ['ac', 'wifi', 'usb']
    providers?: number[]         // Filter by specific providers
    page?: number
    perPage?: number
  }): Promise<MarketplaceSearchResult> {
    // 1. Find all trips matching route + date
    // 2. Filter: visibility = 'public', status = 'scheduled', available_seats >= passengers
    // 3. Filter by seat class, price range, vehicle features
    // 4. Join: vehicle info, provider info (org or driver), rating
    // 5. Sort by chosen criteria
    // 6. Return with:
    //    - Trip details (departure, arrival, duration)
    //    - Price range (min/max across seat classes)
    //    - Vehicle info (type, features, photos)
    //    - Provider info (name, logo, rating, total trips)
    //    - Available seat count
  }

  async getPopularRoutes(limit: number = 10): Promise<PopularRoute[]> {
    // Aggregate bookings by route for last 30 days
    // Return: route, booking count, avg price, provider count
    // Cache in Redis (TTL: 1 hour)
  }

  async getProviderProfile(orgId: number): Promise<ProviderProfile> {
    // Organization details
    // Fleet summary (vehicle types, total)
    // Routes served
    // Rating + review count
    // Trip count
    // Member since
  }
}
```

---

### 2. Rating & Review System

#### Database Migrations

##### `reviews`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id     -- Reviewer
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
driver_user_id        BIGINT UNSIGNED FK -> users.id NULL
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id NULL
booking_id            BIGINT UNSIGNED FK -> bookings.id  -- Must have completed booking
trip_id               BIGINT UNSIGNED FK -> trips.id
overall_rating        TINYINT CHECK (overall_rating BETWEEN 1 AND 5)
comfort_rating        TINYINT NULL
punctuality_rating    TINYINT NULL
service_rating        TINYINT NULL
comment               TEXT NULL
is_published          BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(user_id, booking_id)                              -- One review per booking
INDEX(organization_id, overall_rating)
INDEX(driver_user_id, overall_rating)
INDEX(vehicle_id, overall_rating)
```

#### Review Service
```typescript
// app/services/review_service.ts
export class ReviewService {
  async submit(userId: number, data: CreateReviewData): Promise<Review> {
    // 1. Verify booking belongs to user and trip is completed
    // 2. Verify no existing review for this booking
    // 3. Create review
    // 4. Recalculate aggregate ratings:
    //    - Update organization.rating (avg of all org reviews)
    //    - Update vehicle.rating (avg of vehicle reviews)
    //    - Store in Redis for fast access
    // 5. Emit ReviewSubmitted event
  }

  async getAggregateRating(entityType: 'organization' | 'driver' | 'vehicle', entityId: number): Promise<AggregateRating> {
    // Try Redis cache first
    // Fallback: compute from DB
    // Return: { average, count, distribution: {1: n, 2: n, 3: n, 4: n, 5: n} }
  }
}
```

---

### 3. Independent Driver Self-Registration

#### Registration Flow
```
1. User registers normally (phone + OTP)
2. User navigates to "Become a Driver" page
3. User fills out:
   - Personal info (already from registration)
   - Driver license upload (KYC document)
   - Vehicle info (brand, model, plate, photos)
   - Seat layout configuration
   - Routes they serve
   - Pricing
4. System creates:
   - Organization (type: 'independent') auto-created
   - OrganizationMember (role: 'owner')
   - Vehicle (linked to org)
   - KYC documents submitted for review
5. Status: pending verification
6. Admin reviews and approves/rejects
7. Once approved:
   - Organization is active
   - Vehicle is verified
   - Driver can create trips and accept bookings
```

#### API Endpoints
```
POST   /api/v1/driver/register                  # Submit driver registration
GET    /api/v1/driver/registration-status       # Check registration status
PUT    /api/v1/driver/profile                    # Update driver profile
```

---

### 4. Advanced Analytics

#### Database: `analytics_events` (optional, for fine-grained analytics)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
event_type            VARCHAR(50)             -- 'search', 'view_trip', 'start_booking', 'complete_booking'
user_id               BIGINT UNSIGNED NULL
session_id            VARCHAR(36) NULL
properties            JSON                    -- Event-specific data
created_at            TIMESTAMP
INDEX(event_type, created_at)
```

#### Analytics Service
```typescript
// app/services/analytics_service.ts
export class AnalyticsService {
  /**
   * Demand analysis: which routes have the most searches vs availability
   */
  async demandAnalysis(period: DateRange): Promise<DemandReport> {
    // Searches per route vs bookings per route
    // Identify underserved routes (high search, low supply)
    // Identify oversupplied routes (low search, high supply)
  }

  /**
   * Revenue forecasting based on historical trends
   */
  async revenueForecast(orgId: number, months: number): Promise<ForecastResult> {
    // Simple moving average or linear regression
    // Based on last 6-12 months of revenue data
    // Return: projected revenue per month with confidence interval
  }

  /**
   * Peak time analysis
   */
  async peakAnalysis(orgId: number, period: DateRange): Promise<PeakAnalysis> {
    // Bookings by hour of day, by day of week
    // Identify peak travel days and times
    // Suggest optimal trip scheduling
  }

  /**
   * Customer retention metrics
   */
  async retentionMetrics(orgId: number): Promise<RetentionData> {
    // New vs returning customers per month
    // Repeat booking rate
    // Customer lifetime value estimate
  }
}
```

#### API Endpoints
```
GET    /api/v1/analytics/demand                  # Demand analysis (admin)
GET    /api/v1/analytics/forecast                # Revenue forecast
GET    /api/v1/analytics/peaks                   # Peak time analysis
GET    /api/v1/analytics/retention               # Customer retention
GET    /api/v1/analytics/funnel                  # Search → view → book conversion
```

---

### 5. External API (Third-Party Integrations)

#### API Key Management
```
api_keys
  id                    BIGINT UNSIGNED AUTO_INCREMENT PK
  organization_id       BIGINT UNSIGNED FK -> organizations.id
  name                  VARCHAR(100)
  key_hash              VARCHAR(255)           -- SHA-256 hash of the API key
  key_prefix            VARCHAR(10)            -- First 8 chars for identification: 'sk_live_...'
  scopes                JSON                   -- ['trips:read', 'bookings:create', ...]
  rate_limit            INT DEFAULT 100        -- Requests per minute
  last_used_at          TIMESTAMP NULL
  expires_at            TIMESTAMP NULL
  is_active             BOOLEAN DEFAULT true
  created_at            TIMESTAMP
  updated_at            TIMESTAMP
  INDEX(key_hash)
  INDEX(organization_id)
```

#### External API Endpoints (v1)
```
# Authentication: via API key in Authorization header
# Authorization: Bearer sk_live_xxxxxxxxxxxx

# Read-only endpoints
GET    /api/v1/external/trips                   # List org's trips
GET    /api/v1/external/trips/:id               # Get trip details
GET    /api/v1/external/trips/:id/seats         # Get seat availability
GET    /api/v1/external/bookings                # List org's bookings
GET    /api/v1/external/bookings/:id            # Get booking details
GET    /api/v1/external/vehicles                # List org's vehicles

# Write endpoints (if scope allows)
POST   /api/v1/external/bookings                # Create booking
POST   /api/v1/external/bookings/:id/cancel     # Cancel booking

# Webhooks (org configures callback URL)
# Events: booking.created, booking.cancelled, payment.completed, trip.departed, trip.completed
```

#### API Key Authentication Middleware
```typescript
// app/middleware/api_key_middleware.ts
export default class ApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('Authorization')
    if (!authHeader?.startsWith('Bearer sk_')) {
      throw new UnauthorizedException('Invalid API key')
    }

    const key = authHeader.replace('Bearer ', '')
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')

    const apiKey = await ApiKey.query()
      .where('key_hash', keyHash)
      .where('is_active', true)
      .preload('organization')
      .first()

    if (!apiKey) throw new UnauthorizedException('Invalid API key')
    if (apiKey.expiresAt && apiKey.expiresAt < DateTime.now()) {
      throw new UnauthorizedException('API key expired')
    }

    // Rate limiting per API key
    const limiter = await rateLimiter.get(`api_key:${apiKey.id}`)
    if (limiter.remaining <= 0) throw new TooManyRequestsException()

    ctx.apiKey = apiKey
    ctx.organization = apiKey.organization

    // Update last_used_at
    await apiKey.merge({ lastUsedAt: DateTime.now() }).save()

    return next()
  }
}
```

#### OpenAPI Documentation
```typescript
// Generate OpenAPI 3.0 spec from route definitions
// Serve via Swagger UI at /docs
// Or generate static documentation site

// Tools: @adonisjs/swagger or manual OpenAPI spec file
// Document all endpoints with:
//   - Request/response schemas
//   - Authentication requirements
//   - Rate limits
//   - Error codes
//   - Example requests/responses
```

---

### 6. Webhook System (Outgoing)

```
webhook_endpoints
  id                    BIGINT UNSIGNED AUTO_INCREMENT PK
  organization_id       BIGINT UNSIGNED FK -> organizations.id
  url                   VARCHAR(500)
  secret                VARCHAR(255)           -- For HMAC signature
  events                JSON                   -- ['booking.created', 'payment.completed']
  is_active             BOOLEAN DEFAULT true
  last_triggered_at     TIMESTAMP NULL
  failure_count         INT DEFAULT 0          -- Deactivate after 10 consecutive failures
  created_at            TIMESTAMP
  updated_at            TIMESTAMP

webhook_deliveries
  id                    BIGINT UNSIGNED AUTO_INCREMENT PK
  webhook_endpoint_id   BIGINT UNSIGNED FK
  event_type            VARCHAR(100)
  payload               JSON
  response_status       SMALLINT NULL
  response_body         TEXT NULL
  delivered_at          TIMESTAMP NULL
  created_at            TIMESTAMP
```

```typescript
// app/services/webhook_service.ts
export class WebhookService {
  async dispatch(orgId: number, eventType: string, payload: any): Promise<void> {
    // 1. Find active webhook endpoints for this org + event type
    // 2. For each endpoint:
    //    a. Sign payload with HMAC-SHA256 using endpoint.secret
    //    b. Dispatch WebhookDeliveryJob to BullMQ
    //    c. Job makes HTTP POST with payload + signature header
    //    d. Record delivery result
    //    e. On failure: increment failure_count, retry 3 times
    //    f. After 10 consecutive failures: deactivate endpoint, notify org
  }
}
```

---

### 7. Frontend Components

#### Marketplace Pages
- **MarketplaceHome** — Hero search bar + popular routes + featured providers
- **MarketplaceSearch** — Results page with filters sidebar (price, features, time, provider, class)
- **ProviderProfile** — Agency/driver public profile with reviews, fleet, routes
- **RentalMarketplace** — Browse available vehicles for rental with type/date filters

#### Review Components
- **ReviewForm** — Star rating (overall + sub-categories) + comment
- **ReviewList** — List of reviews with user avatar, rating, date
- **RatingDisplay** — Star display + average + count
- **ReviewPrompt** — Post-trip prompt to leave review

#### Driver Registration
- **DriverRegistrationWizard** — Multi-step form:
  1. Personal info
  2. Driver license upload
  3. Vehicle info + photos
  4. Seat layout setup (using editor from Skill 03)
  5. Routes + pricing
  6. Review + submit

#### API Management (Agency Dashboard)
- **ApiKeyList** — List API keys with usage stats
- **ApiKeyCreate** — Create new key with scope selection
- **ApiKeyRevoke** — Revoke key
- **WebhookList** — List webhook endpoints
- **WebhookCreate** — Add webhook URL with event selection
- **WebhookDeliveryLog** — View delivery attempts and responses

#### Analytics (Agency Dashboard)
- **DemandHeatmap** — Heatmap of demand by route and time
- **RevenueForecast** — Line chart with projected revenue
- **PeakAnalysis** — Bar chart of bookings by hour/day
- **RetentionChart** — New vs returning customers over time
- **ConversionFunnel** — Search → View → Book → Pay funnel visualization

---

## Acceptance Criteria

1. Public marketplace shows trips from all public providers, searchable and filterable
2. Popular routes section shows correct data (cached, refreshed hourly)
3. Provider profile displays rating, fleet, and routes
4. Review can only be submitted for completed bookings, one per booking
5. Aggregate ratings update when new reviews are submitted
6. Driver self-registration wizard works end-to-end
7. Admin can verify/reject driver registrations
8. API keys can be created, used, and revoked
9. External API returns correct data scoped to the API key's organization
10. API key rate limiting works (returns 429 when exceeded)
11. Webhooks fire on configured events and retry on failure
12. OpenAPI docs are accessible and accurate
13. Demand analysis correctly identifies underserved routes
14. Revenue forecast generates reasonable projections

---

## Dependencies
- Skills 01-05 (Core platform)
- Skill 09 (Dashboards)
- Skill 10 (KYC)

## Blocks
- None (this is the final feature layer)
