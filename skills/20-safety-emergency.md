# Skill 20: Safety & Emergency Features

## Objective
Build safety features that protect passengers and drivers during trips: SOS emergency button, live trip sharing with family/friends, incident reporting, emergency contacts, optional trip insurance, and driver behavior monitoring from GPS data.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 07 (Hardware — GPS) completed
- Skill 06 (Notifications) completed

---

## Scope

### 1. Database Migrations

#### `emergency_contacts`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
name                  VARCHAR(200)
phone_number          VARCHAR(20)
relationship          VARCHAR(50)              -- 'parent', 'spouse', 'sibling', 'friend', 'other'
is_primary            BOOLEAN DEFAULT false
notify_on_departure   BOOLEAN DEFAULT true
notify_on_arrival     BOOLEAN DEFAULT true
notify_on_sos         BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(user_id)
```

#### `trip_shares`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_id            BIGINT UNSIGNED FK -> bookings.id
user_id               BIGINT UNSIGNED FK -> users.id
share_token           VARCHAR(64) UNIQUE        -- Public token for tracking link
shared_with_name      VARCHAR(200) NULL
shared_with_phone     VARCHAR(20) NULL
shared_with_email     VARCHAR(255) NULL
is_active             BOOLEAN DEFAULT true
expires_at            TIMESTAMP                 -- Auto-expire after trip arrival + 2h
created_at            TIMESTAMP
INDEX(share_token)
INDEX(booking_id)
```

#### `sos_alerts`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
booking_id            BIGINT UNSIGNED FK -> bookings.id NULL
trip_id               BIGINT UNSIGNED FK -> trips.id NULL
type                  ENUM('sos', 'accident', 'breakdown', 'security', 'medical', 'other')
status                ENUM('active', 'responding', 'resolved', 'false_alarm') DEFAULT 'active'
latitude              DECIMAL(10,8) NULL
longitude             DECIMAL(11,8) NULL
description           TEXT NULL
resolved_by           BIGINT UNSIGNED FK -> users.id NULL
resolved_at           TIMESTAMP NULL
resolution_note       TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(status, created_at)
INDEX(trip_id)
```

#### `incidents`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
trip_id               BIGINT UNSIGNED FK -> trips.id
reported_by           BIGINT UNSIGNED FK -> users.id
type                  ENUM('accident', 'breakdown', 'delay', 'security', 'medical',
                           'road_condition', 'driver_behavior', 'other')
severity              ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium'
description           TEXT
latitude              DECIMAL(10,8) NULL
longitude             DECIMAL(11,8) NULL
photos                JSON NULL                 -- [{url, thumbnail_url}]
status                ENUM('reported', 'acknowledged', 'investigating', 'resolved') DEFAULT 'reported'
resolved_at           TIMESTAMP NULL
resolution_note       TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(trip_id)
INDEX(type, status)
```

#### `driver_safety_scores`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id       -- Driver
trip_id               BIGINT UNSIGNED FK -> trips.id
speeding_events       INT DEFAULT 0             -- Times exceeding speed limit
harsh_braking_events  INT DEFAULT 0
harsh_acceleration    INT DEFAULT 0
max_speed_kmh         DECIMAL(5,1) NULL
avg_speed_kmh         DECIMAL(5,1) NULL
safety_score          DECIMAL(3,1) NULL         -- 0-10 score
calculated_at         TIMESTAMP
created_at            TIMESTAMP
INDEX(user_id, created_at)
INDEX(trip_id)
```

### 2. SOS Service

```typescript
// app/services/sos_service.ts
export class SosService {
  async triggerSOS(userId: number, params: {
    bookingId?: number
    type: SosType
    latitude?: number
    longitude?: number
    description?: string
  }): Promise<SosAlert> {
    // 1. Create SOS alert record
    // 2. Immediately notify:
    //    a. User's emergency contacts (SMS + WhatsApp with location link)
    //    b. Trip driver (if on active trip)
    //    c. Agency of the trip
    //    d. Platform admin/safety team
    // 3. Include Google Maps link with location
    // 4. Start recording location updates every 30 seconds
    // 5. Return alert with confirmation
  }

  async resolveSOS(alertId: number, resolvedBy: number, note: string): Promise<void> {
    // Mark as resolved, notify all parties, stop location recording
  }
}
```

### 3. Trip Sharing Service

```typescript
// app/services/trip_share_service.ts
export class TripShareService {
  async shareTrip(bookingId: number, userId: number, shareWith: {
    name?: string
    phone?: string
    email?: string
  }): Promise<TripShare> {
    // 1. Generate unique share_token
    // 2. Create public tracking URL: https://souple.com/track/{token}
    // 3. Set expiry (trip arrival + 2 hours)
    // 4. Send link via SMS/WhatsApp/email to shared contact
    // 5. Return share details
  }

  async getPublicTrackingData(token: string): Promise<PublicTripTracking> {
    // No authentication required — anyone with the link can view
    // Returns: current location, route, ETA, passenger name, trip status
    // Does NOT return: phone number, payment info, other passengers
  }
}

// Public tracking page (Next.js):
// /track/[token] — shows map with live vehicle position, ETA, trip status
// Auto-refreshes via SSE or polling every 30 seconds
// Works without login
```

### 4. Driver Safety Scoring

```typescript
// app/services/driver_safety_service.ts
export class DriverSafetyService {
  async calculateTripSafetyScore(tripId: number): Promise<DriverSafetyScore> {
    // 1. Load GPS tracking logs for the trip
    // 2. Analyze:
    //    - Speeding events (above route speed limit or 120 km/h default)
    //    - Harsh braking (deceleration > 8 m/s2)
    //    - Harsh acceleration (acceleration > 5 m/s2)
    //    - Max and average speed
    // 3. Calculate score: 10 - deductions for each event
    // 4. Store driver_safety_score record
    // 5. Update driver's aggregate safety score
  }

  async getDriverSafetyProfile(driverId: number): Promise<DriverSafetyProfile> {
    // Aggregate scores across all trips
    // Return: average score, total trips, trend (improving/declining), recent events
    // This is visible to passengers on the marketplace (as a safety rating)
  }
}
```

### 5. API Endpoints

```
# Emergency contacts
GET    /api/v1/emergency-contacts                 # My emergency contacts
POST   /api/v1/emergency-contacts                 # Add emergency contact
PUT    /api/v1/emergency-contacts/:id             # Update
DELETE /api/v1/emergency-contacts/:id             # Remove

# SOS
POST   /api/v1/sos                                # Trigger SOS alert
PUT    /api/v1/sos/:id/resolve                    # Resolve SOS (admin/agency)
GET    /api/v1/admin/sos                          # All SOS alerts (admin)

# Trip sharing
POST   /api/v1/bookings/:id/share                # Share trip with someone
GET    /api/v1/bookings/:id/shares                # My shares for this booking
DELETE /api/v1/trip-shares/:id                    # Revoke share
GET    /api/v1/track/:token                       # Public tracking (no auth)

# Incidents
POST   /api/v1/incidents                          # Report incident
GET    /api/v1/incidents                          # My reported incidents
GET    /api/v1/org/incidents                      # Org's trip incidents
PUT    /api/v1/admin/incidents/:id                # Update incident status

# Driver safety
GET    /api/v1/drivers/:id/safety                 # Driver safety profile (public)
GET    /api/v1/org/drivers/safety                 # All drivers safety scores
```

### 6. Frontend Components

- **SOSButton** — Large red button on trip tracking screen (passenger and driver), 3-second hold to activate
- **EmergencyContactManager** — CRUD emergency contacts in profile settings
- **TripShareButton** — Share button on active booking, enter name + phone/email
- **PublicTrackingPage** — Map with live vehicle position, ETA, trip info (no login required)
- **IncidentReportForm** — Type selector, description, photo upload, auto-fill location
- **DriverSafetyBadge** — Safety score display on marketplace provider cards (shield icon + score)
- **SOSAdminPanel** — Active alerts with map pins, resolve actions, history
- **SafetyDashboard** (Agency) — Fleet safety scores, incidents, trends

---

## Acceptance Criteria

1. SOS button works and notifies emergency contacts + agency + admin within 10 seconds
2. SOS alert includes GPS location as a clickable map link in SMS/WhatsApp
3. Emergency contacts can be managed (add, edit, remove, set primary)
4. Trip sharing generates a public link that shows live vehicle tracking without login
5. Shared tracking page auto-updates position every 30 seconds
6. Trip share links expire automatically after trip arrival + 2 hours
7. Emergency contacts notified on trip departure and arrival (if enabled)
8. Incident reports can be filed with photos and location
9. Driver safety scores calculated from GPS data after each trip
10. Safety scores visible on marketplace provider cards
11. Admin has overview of all active SOS alerts on a map

---

## Dependencies
- Skill 01, 04, 06
- Skill 07 (Hardware — GPS tracking data)

## Blocks
- None
