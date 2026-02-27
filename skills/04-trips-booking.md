# Skill 04: Trips & Booking

## Objective
Implement the core trip management and booking system with **full multi-stop route support (escales)**. A bus traveling A → B → C → D → E allows different passengers to board and alight at different stops, with the same seat reused across non-overlapping segments. Includes trip creation, segment-based seat availability, booking with boarding/alighting stops, pricing per segment, QR tickets, fleet booking, and ticketer POS.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 03 (Fleet & Vehicles) completed

---

## Core Concept: Segment-Based Seat Availability

### The Problem
A bus goes from Kinshasa(A) → Kikwit(B) → Kananga(C) → Mbuji-Mayi(D) → Lubumbashi(E).

This route has **4 segments**: A→B, B→C, C→D, D→E.

A single seat (e.g., seat 5) can be used by **multiple passengers** on **non-overlapping segments**:

```
Seat 5 timeline:
  A ──────── B ──────── C ──────── D ──────── E
  [Passenger 1: A→B   ]
                        [Passenger 2: C→E                ]
  ← seat available B→C →
```

- Passenger 1: A → B (seat 5 occupied on segment A→B)
- Passenger 2: C → E (seat 5 occupied on segments C→D, D→E)
- A new passenger wanting B → C on seat 5? **Allowed** (no overlap)
- A new passenger wanting B → D on seat 5? **Blocked** (overlaps with Passenger 2 on C→D)

### The Solution: Interval Overlap Check
Instead of a single seat status, we check availability **per segment**. A seat is available for a boarding→alighting pair if **no existing booking** for that seat has overlapping stop ranges.

**Overlap formula**: Seat is **occupied** if any existing booking satisfies:
```
existing.boarding_stop_order < requested.alighting_stop_order
AND existing.alighting_stop_order > requested.boarding_stop_order
```

This is the classic interval overlap check.

---

## Scope

### 1. Database Migrations

#### `price_rules`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
route_id              BIGINT UNSIGNED FK -> routes.id
from_stop_order       SMALLINT NULL               -- NULL = full route
to_stop_order         SMALLINT NULL               -- NULL = full route
seat_class_id         BIGINT UNSIGNED FK -> seat_classes.id NULL   -- NULL = all classes
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id NULL       -- NULL = all vehicles
base_price            DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'CDF'
price_mode            ENUM('fixed', 'per_segment', 'per_km') DEFAULT 'fixed'
per_segment_price     DECIMAL(12,2) NULL          -- Price per segment (if mode = per_segment)
per_km_price          DECIMAL(12,4) NULL          -- Price per km (if mode = per_km)
effective_from        DATE
effective_until       DATE NULL
is_peak               BOOLEAN DEFAULT false
peak_multiplier       DECIMAL(4,2) DEFAULT 1.00
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(route_id, organization_id)
INDEX(effective_from, effective_until)
```

#### `trips`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
driver_user_id        BIGINT UNSIGNED FK -> users.id
route_id              BIGINT UNSIGNED FK -> routes.id
seat_layout_id        BIGINT UNSIGNED FK -> seat_layouts.id
departure_at          DATETIME                    -- Departure from FIRST stop
estimated_arrival_at  DATETIME NULL               -- Arrival at LAST stop
actual_departure_at   DATETIME NULL
actual_arrival_at     DATETIME NULL
total_seats           SMALLINT
status                ENUM('scheduled', 'boarding', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled'
notes                 TEXT NULL
is_recurring          BOOLEAN DEFAULT false
recurrence_rule       VARCHAR(255) NULL
allow_intermediate_boarding BOOLEAN DEFAULT true  -- Can passengers board/alight at intermediate stops?
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(departure_at)
INDEX(status)
INDEX(route_id, departure_at)
INDEX(organization_id, departure_at)
INDEX(driver_user_id, departure_at)
```

#### `trip_stops` (materialized from route_stops for each trip)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
trip_id               BIGINT UNSIGNED FK -> trips.id
city_id               BIGINT UNSIGNED FK -> cities.id
stop_order            SMALLINT                    -- 0 = origin, 1 = first stop, ..., N = final destination
stop_name             VARCHAR(200) NULL           -- Optional: specific terminal/station name
scheduled_arrival_at  DATETIME NULL               -- NULL for first stop (origin)
scheduled_departure_at DATETIME NULL              -- NULL for last stop (destination)
actual_arrival_at     DATETIME NULL
actual_departure_at   DATETIME NULL
distance_from_start_km DECIMAL(8,2) DEFAULT 0
boarding_enabled      BOOLEAN DEFAULT true        -- Can passengers board here?
alighting_enabled     BOOLEAN DEFAULT true        -- Can passengers alight here?
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(trip_id, stop_order)
INDEX(trip_id, city_id)
```

#### `trip_seats`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
trip_id               BIGINT UNSIGNED FK -> trips.id
seat_identifier       VARCHAR(10)                 -- 'A1', 'B3'
seat_class            VARCHAR(50)
full_trip_price       DECIMAL(12,2)               -- Price for the entire route (reference)
currency              VARCHAR(3) DEFAULT 'CDF'
is_blocked            BOOLEAN DEFAULT false        -- Permanently blocked (broken seat, etc.)
features              JSON NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(trip_id, seat_identifier)
INDEX(trip_id, is_blocked)
```

**Note**: `trip_seats` no longer has `status` or `booking_id` — availability is computed dynamically from `booking_seats` using the segment overlap check.

#### `bookings`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_code          VARCHAR(20) UNIQUE          -- 'SP-XXXXXXXX'
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
trip_id               BIGINT UNSIGNED FK -> trips.id
user_id               BIGINT UNSIGNED FK -> users.id NULL    -- NULL for walk-in
ticketer_id           BIGINT UNSIGNED FK -> users.id NULL
agent_id              BIGINT UNSIGNED FK -> agents.id NULL   -- For agent bookings (Skill 17)
source                ENUM('web', 'pos', 'ussd', 'whatsapp', 'agent', 'api', 'corporate') DEFAULT 'web'
type                  ENUM('individual', 'group') DEFAULT 'individual'
passenger_name        VARCHAR(200)
passenger_phone       VARCHAR(20)
passenger_email       VARCHAR(255) NULL
boarding_stop_id      BIGINT UNSIGNED FK -> trip_stops.id    -- Where passenger boards
alighting_stop_id     BIGINT UNSIGNED FK -> trip_stops.id    -- Where passenger alights
boarding_stop_order   SMALLINT                               -- Denormalized for fast queries
alighting_stop_order  SMALLINT                               -- Denormalized for fast queries
seat_count            SMALLINT
total_amount          DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'CDF'
status                ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'refunded') DEFAULT 'pending'
qr_code_data          VARCHAR(500)
checked_in_at         TIMESTAMP NULL
checked_out_at        TIMESTAMP NULL              -- When passenger alights (for intermediate stops)
cancellation_reason   TEXT NULL
cancelled_by_id       BIGINT UNSIGNED FK -> users.id NULL
offline_id            VARCHAR(36) NULL
synced_at             TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(booking_code)
INDEX(trip_id, boarding_stop_order, alighting_stop_order)
INDEX(user_id)
INDEX(passenger_phone)
INDEX(offline_id)
INDEX(status)
```

#### `booking_seats`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_id            BIGINT UNSIGNED FK -> bookings.id
trip_seat_id          BIGINT UNSIGNED FK -> trip_seats.id
passenger_name        VARCHAR(200) NULL           -- For group bookings with different names
created_at            TIMESTAMP
INDEX(trip_seat_id)
INDEX(booking_id)
```

#### `seat_reservations` (temporary holds)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
trip_id               BIGINT UNSIGNED FK -> trips.id
trip_seat_id          BIGINT UNSIGNED FK -> trip_seats.id
user_id               BIGINT UNSIGNED FK -> users.id NULL
boarding_stop_order   SMALLINT
alighting_stop_order  SMALLINT
reserved_until        TIMESTAMP
created_at            TIMESTAMP
INDEX(trip_seat_id, boarding_stop_order, alighting_stop_order)
INDEX(reserved_until)
```

#### `fleet_bookings`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_code          VARCHAR(20) UNIQUE
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
user_id               BIGINT UNSIGNED FK -> users.id
driver_user_id        BIGINT UNSIGNED FK -> users.id NULL
type                  ENUM('event', 'moving', 'day_rental', 'pickup', 'custom')
title                 VARCHAR(255)
description           TEXT NULL
start_at              DATETIME
end_at                DATETIME
pickup_location       VARCHAR(500)
pickup_latitude       DECIMAL(10,8) NULL
pickup_longitude      DECIMAL(11,8) NULL
dropoff_location      VARCHAR(500) NULL
dropoff_latitude      DECIMAL(10,8) NULL
dropoff_longitude     DECIMAL(11,8) NULL
total_amount          DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'CDF'
status                ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending'
notes                 TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(vehicle_id, start_at)
INDEX(user_id)
INDEX(status)
```

---

### 2. Segment-Based Seat Availability Engine

This is the core algorithm that makes multi-stop routes work.

```typescript
// app/services/seat_availability_service.ts
export class SeatAvailabilityService {

  /**
   * Get available seats for a specific boarding → alighting segment.
   *
   * A seat is AVAILABLE for the requested segment if:
   * 1. The seat is not blocked (is_blocked = false)
   * 2. No active booking (status NOT IN cancelled, refunded) exists where:
   *    existing.boarding_stop_order < requested.alighting_stop_order
   *    AND existing.alighting_stop_order > requested.boarding_stop_order
   * 3. No active reservation exists with the same overlap logic
   *    AND reservation.reserved_until > now
   *
   * @example
   * Route: A(0) → B(1) → C(2) → D(3) → E(4)
   * Existing booking on seat 5: boarding=0, alighting=2 (A→C)
   * Request seat 5 for boarding=2, alighting=4 (C→E): AVAILABLE (no overlap: 0<4 but 2 is NOT > 2)
   * Request seat 5 for boarding=1, alighting=3 (B→D): BLOCKED (0<3 AND 2>1 = overlap on B→C)
   */
  async getAvailableSeats(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<TripSeat[]> {
    // 1. Get all trip_seats where is_blocked = false
    // 2. Get all active bookings for this trip (status NOT IN cancelled, refunded)
    // 3. Get all active reservations (reserved_until > now)
    // 4. For each seat: check if ANY booking/reservation overlaps
    // 5. Return seats with no overlaps

    // SQL approach (efficient single query):
    const occupiedSeatIds = await db.rawQuery(`
      SELECT DISTINCT bs.trip_seat_id
      FROM booking_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.trip_id = ?
        AND b.status NOT IN ('cancelled', 'refunded')
        AND b.boarding_stop_order < ?
        AND b.alighting_stop_order > ?
      UNION
      SELECT sr.trip_seat_id
      FROM seat_reservations sr
      WHERE sr.trip_id = ?
        AND sr.reserved_until > NOW()
        AND sr.boarding_stop_order < ?
        AND sr.alighting_stop_order > ?
    `, [tripId, alightingStopOrder, boardingStopOrder,
        tripId, alightingStopOrder, boardingStopOrder])

    return await TripSeat.query()
      .where('trip_id', tripId)
      .where('is_blocked', false)
      .whereNotIn('id', occupiedSeatIds.map(r => r.trip_seat_id))
  }

  /**
   * Get seat availability summary per stop pair.
   * Used for the seat map: shows each seat's status for the requested segment.
   */
  async getSeatMap(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<SeatMapEntry[]> {
    // For each seat, return:
    // { seatIdentifier, seatClass, price, status: 'available' | 'booked' | 'reserved' | 'blocked' }
    // Price calculated for the specific segment, not the full trip
  }

  /**
   * Calculate available seat count per segment of a trip.
   * Used for search results to show "X seats available" for the requested leg.
   */
  async getAvailableCountPerSegment(tripId: number): Promise<SegmentAvailability[]> {
    // For each consecutive stop pair (segment):
    //   Count seats that have no overlapping bookings
    // Returns: [{ from: 'Kinshasa', to: 'Kikwit', available: 28 }, ...]
    // The minimum across requested segments = available for a multi-segment booking
  }

  /**
   * Check if specific seats are available for a segment.
   * Used before creating a booking to prevent race conditions.
   * Uses SELECT ... FOR UPDATE for row-level locking.
   */
  async checkAndLockSeats(
    tripId: number,
    seatIds: number[],
    boardingStopOrder: number,
    alightingStopOrder: number
  ): Promise<{ available: boolean, conflicts: ConflictInfo[] }> {
    // Within a transaction with FOR UPDATE lock:
    // 1. Check each requested seat for overlapping bookings/reservations
    // 2. If all clear: return available = true
    // 3. If any conflict: return available = false with conflict details
  }
}
```

### 3. Segment-Based Pricing

```typescript
// app/services/price_service.ts
export class PriceService {

  /**
   * Calculate price for a specific boarding → alighting segment.
   * Supports three pricing modes:
   *
   * 1. FIXED: Set price per origin-destination pair
   *    - Look up price_rule matching from_stop_order and to_stop_order
   *    - If not found, fall back to full route price prorated by segments
   *
   * 2. PER_SEGMENT: Price × number of segments traversed
   *    - A→E (4 segments) = per_segment_price × 4
   *    - B→D (2 segments) = per_segment_price × 2
   *
   * 3. PER_KM: Price × distance in km
   *    - Use distance_from_start_km from trip_stops to calculate leg distance
   *    - A→C distance = trip_stops[C].distance_from_start - trip_stops[A].distance_from_start
   */
  async calculateSegmentPrice(params: {
    tripId: number
    routeId: number
    boardingStopOrder: number
    alightingStopOrder: number
    seatClass: string
    date: DateTime
    orgId?: number
    vehicleId?: number
  }): Promise<PriceResult> {
    // 1. Find most specific price_rule:
    //    a. Exact from_stop_order + to_stop_order match
    //    b. Full route rule (from_stop_order IS NULL)
    //    c. Per-segment or per-km fallback
    // 2. Apply seat class multiplier
    // 3. Apply peak multiplier if applicable
    // 4. Return { base_price, segment_count, final_price, currency, breakdown }
  }

  /**
   * Generate price matrix for all possible stop pairs on a route.
   * Used by agencies to review/set pricing for all legs.
   */
  async getPriceMatrix(tripId: number, seatClass: string): Promise<PriceMatrix> {
    // Returns NxN matrix where N = number of stops
    // matrix[boarding][alighting] = price
    // Only upper triangle is valid (boarding < alighting)
  }
}
```

---

### 4. API Endpoints

#### Price Rules
```
GET    /api/v1/price-rules                        # List price rules (org-scoped)
POST   /api/v1/price-rules                        # Create price rule
PUT    /api/v1/price-rules/:id                    # Update price rule
DELETE /api/v1/price-rules/:id                    # Delete price rule
GET    /api/v1/price-rules/calculate              # Calculate price for segment+class+date
GET    /api/v1/price-rules/matrix/:routeId        # Price matrix for all stop pairs
```

#### Trips
```
GET    /api/v1/trips                              # List trips (filtered)
POST   /api/v1/trips                              # Create trip (materializes seats + stops)
GET    /api/v1/trips/:id                          # Trip details with stops
PUT    /api/v1/trips/:id                          # Update trip
DELETE /api/v1/trips/:id                          # Cancel trip
GET    /api/v1/trips/:id/stops                    # Get all stops with schedule
PUT    /api/v1/trips/:id/stops/:stopId            # Update stop times (actual arrival/departure)
GET    /api/v1/trips/:id/seats                    # Seat map (requires ?boarding_stop&alighting_stop)
POST   /api/v1/trips/:id/start                    # Mark trip as in_progress
POST   /api/v1/trips/:id/arrive/:stopId           # Mark arrival at intermediate stop
POST   /api/v1/trips/:id/depart/:stopId           # Mark departure from intermediate stop
POST   /api/v1/trips/:id/complete                 # Mark trip as completed

# Public search (supports intermediate stops)
GET    /api/v1/trips/search?from=:cityId&to=:cityId&date=:date&seats=:count
```

#### Bookings
```
POST   /api/v1/bookings                           # Create booking (with boarding/alighting stops)
GET    /api/v1/bookings                           # List bookings (filtered)
GET    /api/v1/bookings/:id                       # Booking details
PUT    /api/v1/bookings/:id                       # Update booking
POST   /api/v1/bookings/:id/cancel                # Cancel booking
POST   /api/v1/bookings/:id/check-in              # Check in at boarding stop
POST   /api/v1/bookings/:id/check-out             # Check out at alighting stop
GET    /api/v1/bookings/:id/ticket                 # Ticket data (for print/display)
GET    /api/v1/bookings/track/:code                # Public: track booking by code
POST   /api/v1/bookings/sync                       # Sync offline bookings (batch)

# Seat reservation (with segment info)
POST   /api/v1/trips/:tripId/seats/reserve         # Reserve seats for segment (5 min hold)
DELETE /api/v1/trips/:tripId/seats/reserve/:id     # Release reservation
```

#### Fleet Bookings
```
GET    /api/v1/fleet-bookings                     # List fleet bookings
POST   /api/v1/fleet-bookings                     # Create fleet booking
GET    /api/v1/fleet-bookings/:id                 # Get details
PUT    /api/v1/fleet-bookings/:id                 # Update
POST   /api/v1/fleet-bookings/:id/cancel          # Cancel
POST   /api/v1/fleet-bookings/:id/confirm         # Confirm (org side)
```

---

### 5. Backend Services

#### TripService
```typescript
class TripService {
  async create(data: CreateTripData): Promise<Trip> {
    // 1. Create trip record
    // 2. Materialize trip_stops from route_stops:
    //    - Copy all stops with order, city, distances
    //    - Calculate scheduled arrival/departure times based on:
    //      departure_at + estimated durations per segment
    // 3. Materialize trip_seats from seat layout:
    //    - For each bookable seat, create a trip_seat row
    //    - Calculate full_trip_price using PriceService
    // 4. Set total_seats = count of bookable seats
    // 5. Emit TripCreated event
  }

  async search(filters: TripSearchFilters): Promise<PaginatedResult<TripSearchResult>> {
    // CRITICAL: Must support intermediate stop matching
    //
    // User searches: "Kikwit → Mbuji-Mayi"
    // This should match a trip "Kinshasa → Lubumbashi" if:
    //   - Kikwit and Mbuji-Mayi are both stops on the route
    //   - Kikwit.stop_order < Mbuji-Mayi.stop_order
    //   - boarding_enabled = true at Kikwit
    //   - alighting_enabled = true at Mbuji-Mayi
    //   - Enough seats available for the Kikwit→Mbuji-Mayi segment
    //
    // SQL logic:
    //   JOIN trip_stops ts_board ON ts_board.trip_id = t.id AND ts_board.city_id = :fromCityId AND ts_board.boarding_enabled = true
    //   JOIN trip_stops ts_alight ON ts_alight.trip_id = t.id AND ts_alight.city_id = :toCityId AND ts_alight.alighting_enabled = true
    //   WHERE ts_board.stop_order < ts_alight.stop_order
    //
    // For each result, calculate:
    //   - Available seats for that specific segment
    //   - Price for that specific segment
    //   - Boarding time (ts_board.scheduled_departure_at)
    //   - Alighting time (ts_alight.scheduled_arrival_at)
    //   - Duration for that leg
  }

  async getStopPassengerManifest(tripId: number, stopId: number): Promise<StopManifest> {
    // For a given stop, return:
    // { boarding: [passengers boarding here], alighting: [passengers alighting here], onboard: [passengers continuing through] }
    // Used by driver to know who gets on and off at each stop
  }

  async updateStatus(tripId: number, status: TripStatus): Promise<Trip> {
    // Handle intermediate stop status updates:
    // When arriving at a stop: mark actual_arrival_at
    // When departing from a stop: mark actual_departure_at
    // This enables passengers to track which stop the bus is at
  }
}
```

#### BookingService
```typescript
class BookingService {
  async create(data: CreateBookingData): Promise<Booking> {
    // data includes: tripId, boardingStopId, alightingStopId, seatIds[], passengerInfo
    //
    // 1. Load trip + trip_stops
    // 2. Resolve boarding_stop_order and alighting_stop_order
    // 3. Validate: boarding_stop_order < alighting_stop_order
    // 4. Validate: boarding_enabled at boarding stop, alighting_enabled at alighting stop
    // 5. Check seat availability using SeatAvailabilityService.checkAndLockSeats()
    //    (within transaction with FOR UPDATE)
    // 6. Calculate price using PriceService.calculateSegmentPrice()
    // 7. Check KYC level if org requires it
    // 8. Generate booking code (SP-XXXXXXXX)
    // 9. Create booking (with boarding/alighting stop orders)
    // 10. Create booking_seats records
    // 11. Generate QR code (encodes: booking_code, boarding stop, alighting stop)
    // 12. Emit BookingCreated event
    // All within a single database transaction
  }

  async reserveSeats(params: {
    tripId: number
    seatIds: number[]
    boardingStopOrder: number
    alightingStopOrder: number
    userId?: number
  }): Promise<Reservation> {
    // Create seat_reservation records with 5-minute expiry
    // These are checked by SeatAvailabilityService alongside bookings
    // Use Redis lock for atomicity
  }

  async cancel(bookingId: number, reason: string, cancelledById: number): Promise<Booking> {
    // 1. Update booking status to 'cancelled'
    // 2. No need to "release" seats — availability is computed dynamically
    //    (cancelled bookings are excluded from overlap check)
    // 3. Emit BookingCancelled event (triggers refund in Skill 05)
  }

  async checkIn(bookingId: number): Promise<Booking> {
    // Validate: booking confirmed, trip is boarding or in_progress
    // Validate: bus is at or past the boarding stop
    // Update status to 'checked_in', record checked_in_at
  }

  async checkOut(bookingId: number): Promise<Booking> {
    // For intermediate alighting: mark passenger as alighted
    // Record checked_out_at
    // Update status to 'completed'
  }

  async syncOfflineBookings(bookings: OfflineBooking[]): Promise<SyncResult> {
    // Process batch of offline-created bookings
    // Use offline_id for idempotency
    // For seat-segment conflicts: reject with conflict info
    // Return: { synced: [], conflicts: [], errors: [] }
  }
}
```

#### PriceService
```typescript
class PriceService {
  async calculateSegmentPrice(params: {
    tripId: number
    routeId: number
    boardingStopOrder: number
    alightingStopOrder: number
    seatClass: string
    date: DateTime
    orgId?: number
    vehicleId?: number
  }): Promise<PriceResult> {
    // 1. Find most specific price_rule (priority order):
    //    a. Exact stop pair + org + vehicle + seat class
    //    b. Exact stop pair + org + seat class
    //    c. Exact stop pair + org
    //    d. Full route price, prorated by segments:
    //       prorate = (alighting - boarding) / total_segments
    //       segment_price = full_price * prorate
    //    e. Per-segment mode: per_segment_price × num_segments
    //    f. Per-km mode: per_km_price × segment_distance_km
    // 2. Apply seat class multiplier
    // 3. Apply peak multiplier
    // 4. Return { base_price, final_price, currency, segments, breakdown }
  }
}
```

#### TicketService
```typescript
class TicketService {
  async generateTicketData(bookingId: number): Promise<TicketData> {
    // Return structured data:
    // {
    //   booking_code, qr_code_svg,
    //   passenger_name,
    //   boarding_city, boarding_terminal, boarding_time,
    //   alighting_city, alighting_time,
    //   intermediate_stops: [{city, arrival_time}],  -- stops between boarding and alighting
    //   seats, price,
    //   org_name, org_logo
    // }
  }
}
```

---

### 6. Capacity Management at Stops

```typescript
// app/services/capacity_service.ts
export class CapacityService {
  /**
   * For each stop on a trip, calculate how many passengers are on board.
   * This prevents overbooking at any point on the route.
   *
   * @example Route A → B → C → D → E (bus has 30 seats)
   * After stop A: 25 passengers board → 25 on board
   * After stop B: 5 alight, 8 board → 28 on board
   * After stop C: 3 alight, 6 board → 31 on board ← EXCEEDS CAPACITY!
   *
   * The booking engine must check: at NO stop along the requested segment
   * should total passengers exceed total_seats.
   */
  async getLoadPerStop(tripId: number): Promise<StopLoad[]> {
    // For each stop:
    //   boarding_count = bookings where boarding_stop_order = this stop
    //   alighting_count = bookings where alighting_stop_order = this stop
    //   onboard = previous_onboard + boarding_count - alighting_count
    // Return: [{ stop, boarding, alighting, onboard, capacity, utilization_pct }]
  }

  /**
   * Check if adding a booking would exceed capacity at any stop.
   * Called during booking creation.
   */
  async validateCapacity(
    tripId: number,
    boardingStopOrder: number,
    alightingStopOrder: number,
    seatCount: number
  ): Promise<{ valid: boolean, bottleneckStop?: string, currentLoad?: number }> {
    // For each stop between boarding and alighting:
    //   currentOnboard = count of active bookings whose segment includes this stop
    //   if currentOnboard + seatCount > trip.total_seats: return invalid
    // This is a belt-and-suspenders check on top of individual seat checks
  }
}
```

---

### 7. Frontend Components

#### Public Trip Search
- **TripSearchForm** — From city, to city, date, passenger count
  - City dropdowns include all cities (origin, destination, AND intermediate stops)
  - Auto-suggest cities as user types
- **TripSearchResults** — Results show segment-specific info:
  - Boarding time at the specific stop (not trip origin)
  - Alighting time at the specific stop
  - Duration for that leg
  - Price for that leg
  - Available seats for that leg
- **TripCard** — Shows stops as a visual timeline: `Kinshasa → [Kikwit] → Kananga → [Mbuji-Mayi] → Lubumbashi` (boarding/alighting stops highlighted)
- **RouteTimeline** — Vertical timeline of all stops with times, boarding/alighting icons

#### Booking Flow (Public + Ticketer)
- **StopSelector** — If trip has multiple stops, let user pick boarding and alighting stops
  - Displayed as route timeline with selectable stops
  - Price updates dynamically as stops change
- **SeatSelector** — Interactive seat map showing availability **for the selected segment**
  - Seats color-coded: green (available for your segment), red (booked on overlapping segment), gray (blocked)
  - Tooltip shows which segments the seat is occupied for
- **BookingForm** — Passenger details
- **BookingReview** — Summary: boarding city + time, alighting city + time, seat(s), price
- **BookingConfirmation** — QR code, full journey details with all intermediate stops
- **TicketView** — Shows boarding stop, alighting stop, intermediate stops with times

#### Ticketer POS Interface
- **POSLayout** — Optimized for speed
  - Quick trip selector (today's trips, upcoming)
  - Stop pair selector (from → to dropdown, pre-filled with common pairs)
  - Fast seat selection for the specific segment
  - Walk-in passenger form (name + phone)
  - Payment method (cash, mobile money)
  - One-click print
  - Recent sales list
  - Daily summary widget

#### Trip Management (Agency Dashboard)
- **TripList** — Filterable trips with status badges
- **TripForm** — Create/edit: select vehicle, route, driver, schedule, stop times
- **TripStopsEditor** — Configure per-stop: enable/disable boarding/alighting, set terminal name, adjust times
- **TripDetail** — Full view with:
  - Stop-by-stop passenger manifest (who boards/alights at each stop)
  - Load chart: bar chart showing occupancy at each stop
  - Revenue breakdown by segment
- **RecurringTripSetup** — Configure recurring schedules
- **DriverManifest** — Per-stop view: "At Kikwit: 5 boarding, 3 alighting" with passenger names

#### Fleet Booking (Public + Dashboard)
- **FleetBookingForm** — Full car booking form
- **FleetBookingList** — List with status
- **FleetBookingDetail** — Details with payment status

#### Price Management (Agency Dashboard)
- **PriceRuleList** — Table of price rules (now with stop pair columns)
- **PriceRuleForm** — Create/edit with stop pair selector, pricing mode (fixed/per-segment/per-km)
- **PriceMatrixView** — Interactive grid showing price for every stop combination
- **PriceCalculator** — Preview prices for different segments/classes/dates

---

### 8. Events

```typescript
class BookingCreated {
  constructor(public booking: Booking) {}
}
// Listeners: SendBookingConfirmation, NotifyDriverOfNewPassenger

class BookingCancelled {
  constructor(public booking: Booking, public reason: string) {}
}
// Listeners: ProcessRefund, NotifyPassenger

class TripStatusChanged {
  constructor(public trip: Trip, public oldStatus: string, public newStatus: string) {}
}
// Listeners: NotifyPassengers, NotifyDriver

class TripStopReached {
  constructor(public trip: Trip, public tripStop: TripStop) {}
}
// Listeners: NotifyBoardingPassengers ("Bus arriving at Kikwit"),
//            NotifyAlightingPassengers ("Prepare to alight at Kikwit"),
//            UpdateTripTracking
```

---

## Acceptance Criteria

1. Trip creation materializes both seats AND stops from route definition
2. Search for "Kikwit → Mbuji-Mayi" finds trips on "Kinshasa → Lubumbashi" route if those are intermediate stops
3. Search results show segment-specific boarding time, alighting time, duration, and price
4. Seat map shows availability per selected segment, not globally
5. Same seat can be booked by different passengers on non-overlapping segments
6. Same seat CANNOT be booked on overlapping segments (interval overlap check works)
7. Concurrent bookings for overlapping segments on the same seat are prevented (race condition handled with FOR UPDATE)
8. Price calculation works for all modes: fixed per stop-pair, per-segment, per-km, and prorated
9. Capacity is never exceeded at any stop (load check at every intermediate point)
10. Seat reservation holds seats for 5 minutes for the specific segment
11. Driver can view per-stop manifest (who boards/alights at each stop)
12. Trip status updates track arrival/departure at intermediate stops
13. Ticketer POS supports stop-pair selection for quick selling
14. Booking QR code and ticket show boarding stop, alighting stop, and intermediate stops
15. Booking cancellation correctly frees the seat for those segments
16. Offline bookings sync with segment-aware conflict detection
17. Price matrix shows all stop-pair combinations for a route
18. Load chart visualization shows occupancy at each stop along the route

---

## Dependencies
- Skill 01 (Foundation)
- Skill 03 (Fleet & Vehicles)

## Blocks
- Skill 05 (Payments) — for payment processing in booking flow
- Skill 07 (Hardware) — for ticket printing
- Skill 08 (Offline) — for offline booking creation
