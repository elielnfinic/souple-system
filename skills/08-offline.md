# Skill 08: Offline Support

## Objective
Enable the ticketer and driver dashboards to work fully offline within a company environment. Bookings, parcel registrations, and ticket printing must function without internet. Data syncs automatically when connectivity is restored with conflict resolution.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 07 (Hardware) completed (for offline printing)
- Service Worker support in target browsers

---

## Scope

### 1. Offline Architecture Overview

```
┌────────────────────────────────────────────────────┐
│  Browser (Ticketer/Driver PWA)                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  React App   │  │  Service     │  │  IndexedDB │ │
│  │  (Next.js)   │──│  Worker      │──│  Store     │ │
│  │              │  │  (Workbox)   │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                  │                │       │
│         │    ┌─────────────┴──────┐         │       │
│         │    │  Background Sync   │─────────┘       │
│         │    │  Manager           │                 │
│         │    └─────────────┬──────┘                 │
└─────────┼──────────────────┼────────────────────────┘
          │                  │
          │    (When online) │
          ▼                  ▼
     ┌────────────────────────────┐
     │   Souple API (AdonisJS)   │
     └────────────────────────────┘
```

---

### 2. Service Worker (Workbox Configuration)

```typescript
// public/service-worker.ts (compiled with workbox-webpack-plugin or workbox-cli)

// Strategy 1: App Shell - Cache First
// All static assets (JS, CSS, images, fonts)
registerRoute(
  /\.(js|css|png|jpg|svg|woff2)$/,
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

// Strategy 2: HTML pages - Network First (fall back to cached)
registerRoute(
  /\/(ticketer|driver)/,
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
)

// Strategy 3: API GET requests - Stale While Revalidate
registerRoute(
  /\/api\/v1\/(trips|cities|routes|seat-classes|vehicles)/,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 })],
  })
)

// Strategy 4: API mutations - Queue for Background Sync
registerRoute(
  /\/api\/v1\/(bookings|parcels|payments\/cash|gps)/,
  new NetworkOnly({
    plugins: [new BackgroundSyncPlugin('mutations-queue', {
      maxRetentionTime: 7 * 24 * 60, // 7 days
    })],
  }),
  'POST'
)
```

---

### 3. IndexedDB Local Store

```typescript
// lib/offline-store.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface SoupleDB extends DBSchema {
  trips: {
    key: number
    value: CachedTrip          // Next 7 days of trips for this org
    indexes: { 'by-date': string, 'by-route': number }
  }
  tripSeats: {
    key: string                 // tripId:seatId composite
    value: CachedTripSeat
    indexes: { 'by-trip': number }
  }
  offlineBookings: {
    key: string                 // UUID (offline_id)
    value: OfflineBooking
    indexes: { 'by-status': string, 'by-trip': number }
  }
  offlineParcels: {
    key: string
    value: OfflineParcel
    indexes: { 'by-status': string }
  }
  syncQueue: {
    key: number                 // Auto-increment
    value: SyncQueueItem
    indexes: { 'by-status': string, 'by-type': string }
  }
  printQueue: {
    key: number
    value: PrintQueueItem
    indexes: { 'by-status': string }
  }
  cities: {
    key: number
    value: CachedCity
  }
  routes: {
    key: number
    value: CachedRoute
  }
  seatClasses: {
    key: number
    value: CachedSeatClass
  }
  lastSync: {
    key: string                 // Entity type name
    value: { timestamp: number, count: number }
  }
}

export class OfflineStore {
  private db: IDBPDatabase<SoupleDB>

  async initialize(): Promise<void> {
    this.db = await openDB<SoupleDB>('souple-offline', 1, {
      upgrade(db) {
        // Create all object stores and indexes
      }
    })
  }

  // --- Trip Cache ---
  async cacheTrips(trips: Trip[]): Promise<void>
  async getCachedTrips(filters?: TripFilters): Promise<CachedTrip[]>
  async getCachedTripSeats(tripId: number): Promise<CachedTripSeat[]>
  async updateLocalSeatStatus(tripId: number, seatId: string, status: string): Promise<void>

  // --- Offline Bookings ---
  async createOfflineBooking(booking: OfflineBooking): Promise<string> {
    // Generate UUID as offline_id
    // Store booking with status 'pending_sync'
    // Update local seat availability
    // Add to sync queue
    // Add to print queue
    return offlineId
  }
  async getOfflineBookings(): Promise<OfflineBooking[]>

  // --- Offline Parcels ---
  async createOfflineParcel(parcel: OfflineParcel): Promise<string>
  async getOfflineParcels(): Promise<OfflineParcel[]>

  // --- Sync Queue ---
  async addToSyncQueue(item: SyncQueueItem): Promise<void>
  async getSyncQueue(): Promise<SyncQueueItem[]>
  async markSynced(id: number): Promise<void>
  async markSyncFailed(id: number, error: string): Promise<void>

  // --- Print Queue ---
  async addToPrintQueue(ticket: PrintQueueItem): Promise<void>
  async getPrintQueue(): Promise<PrintQueueItem[]>
  async markPrinted(id: number): Promise<void>

  // --- Reference Data ---
  async cacheCities(cities: City[]): Promise<void>
  async getCachedCities(): Promise<CachedCity[]>
  async cacheRoutes(routes: Route[]): Promise<void>
  async getCachedRoutes(): Promise<CachedRoute[]>
}
```

---

### 4. Sync Manager

```typescript
// lib/sync-manager.ts
export class SyncManager {
  private store: OfflineStore
  private apiClient: ApiClient
  private isOnline: boolean = navigator.onLine

  constructor(store: OfflineStore, apiClient: ApiClient) {
    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline())
    window.addEventListener('offline', () => this.onOffline())
  }

  private async onOnline(): Promise<void> {
    // 1. Sync reference data (cities, routes, seat classes)
    // 2. Sync trip data (refresh cached trips with latest availability)
    // 3. Process sync queue (bookings, parcels)
    // 4. Notify UI of sync status
  }

  private onOffline(): void {
    // Notify UI that offline mode is active
  }

  /**
   * Process all pending sync items
   */
  async processQueue(): Promise<SyncResult> {
    const queue = await this.store.getSyncQueue()
    const results: SyncResult = { synced: [], conflicts: [], errors: [] }

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'booking':
            const result = await this.syncBooking(item)
            if (result.conflict) {
              results.conflicts.push({ item, conflict: result.conflict })
            } else {
              results.synced.push(item)
              await this.store.markSynced(item.id)
            }
            break

          case 'parcel':
            await this.syncParcel(item)
            results.synced.push(item)
            await this.store.markSynced(item.id)
            break
        }
      } catch (error) {
        results.errors.push({ item, error: error.message })
        await this.store.markSyncFailed(item.id, error.message)
      }
    }

    return results
  }

  /**
   * Sync a single offline booking
   */
  private async syncBooking(item: SyncQueueItem): Promise<SyncBookingResult> {
    // POST /api/v1/bookings/sync
    // Server uses offline_id for idempotency:
    //   - If offline_id already exists in DB, return existing booking (no duplicate)
    //   - If seats are no longer available, return conflict
    //   - If trip is cancelled, return error
    // On success: update local booking with server ID
  }

  /**
   * Pre-fetch data for offline use
   */
  async prefetchForOffline(): Promise<void> {
    // 1. Fetch and cache trips for next 7 days (this org)
    // 2. Fetch and cache seat layouts for all org vehicles
    // 3. Fetch and cache all cities and routes
    // 4. Fetch and cache seat classes and price rules
    // 5. Update lastSync timestamps
  }

  /**
   * Check how stale the cached data is
   */
  async getDataFreshness(): Promise<Record<string, { age: string, isStale: boolean }>> {
    // Returns age of each cached dataset
    // isStale = true if > 24 hours old
  }
}
```

---

### 5. Conflict Resolution

#### Strategy: Server Wins + User Prompted

```typescript
interface SeatConflict {
  type: 'seat_unavailable'
  bookingOfflineId: string
  requestedSeats: string[]
  unavailableSeats: string[]
  alternativeSeats: string[]  // Server suggests alternatives
}

interface TripConflict {
  type: 'trip_cancelled' | 'trip_departed' | 'price_changed'
  bookingOfflineId: string
  details: string
}
```

**Conflict resolution UI flow:**
1. Sync completes with conflicts
2. Modal shows each conflict
3. For `seat_unavailable`: Show alternative seats, let user accept or cancel
4. For `price_changed`: Show old/new price, let user accept or cancel
5. For `trip_cancelled`/`trip_departed`: Inform user, offer rebooking

---

### 6. Offline Booking Flow (Ticketer)

```
Ticketer opens POS (offline) →
  1. Select trip (from cached trips for today/tomorrow)
  2. View seat map (from cached seat layout + local availability)
  3. Select seats (update local availability immediately)
  4. Enter passenger info (name + phone)
  5. Record cash payment (no online payment offline)
  6. Generate booking:
     - Create offline_id (UUID)
     - Generate booking code (SP-OFF-XXXXX with offline prefix)
     - Generate QR code locally
     - Store in IndexedDB
     - Add to sync queue
     - Add to print queue
  7. Print ticket (from local data, no server needed)
  8. Done — booking queued for sync
```

---

### 7. Frontend Components

#### Offline UI
- **OfflineIndicator** — Banner/badge showing online/offline status
- **SyncStatus** — Shows sync progress (pending items count, last sync time)
- **SyncResultModal** — Shows sync results after coming online (successes, conflicts)
- **ConflictResolver** — UI for resolving seat/price conflicts
- **DataFreshnessIndicator** — Shows how old the cached data is
- **PrefetchButton** — Manual trigger to download latest data for offline use

#### Offline-Enhanced Existing Components
- **TripList (offline)** — Load from IndexedDB when offline
- **SeatSelector (offline)** — Use local seat availability cache
- **BookingForm (offline)** — Cash-only payment, stores locally
- **TicketView (offline)** — Generate QR from local data
- **ParcelForm (offline)** — Store locally, queue for sync

---

### 8. Backend Sync Endpoint

```typescript
// app/controllers/v1/bookings_controller.ts
async syncOffline({ request, auth }: HttpContext) {
  const { bookings } = await request.validateUsing(syncBookingsValidator)

  const results = {
    synced: [] as SyncedBooking[],
    conflicts: [] as BookingConflict[],
    errors: [] as SyncError[],
  }

  for (const offlineBooking of bookings) {
    // 1. Check idempotency: does offline_id already exist?
    const existing = await Booking.findBy('offline_id', offlineBooking.offlineId)
    if (existing) {
      results.synced.push({ offlineId: offlineBooking.offlineId, booking: existing })
      continue
    }

    // 2. Check trip still exists and is bookable
    const trip = await Trip.find(offlineBooking.tripId)
    if (!trip || trip.status === 'cancelled') {
      results.errors.push({
        offlineId: offlineBooking.offlineId,
        error: 'trip_unavailable',
        message: 'Trip no longer available',
      })
      continue
    }

    // 3. Check seat availability
    const unavailable = await this.checkSeatAvailability(trip.id, offlineBooking.seatIds)
    if (unavailable.length > 0) {
      const alternatives = await this.suggestAlternativeSeats(trip.id, offlineBooking.seatIds.length)
      results.conflicts.push({
        offlineId: offlineBooking.offlineId,
        type: 'seat_unavailable',
        unavailableSeats: unavailable,
        alternativeSeats: alternatives,
      })
      continue
    }

    // 4. Create booking (using BookingService)
    const booking = await bookingService.create({
      ...offlineBooking,
      offlineId: offlineBooking.offlineId,
      syncedAt: DateTime.now(),
    })

    results.synced.push({ offlineId: offlineBooking.offlineId, booking })
  }

  return response.ok({ success: true, data: results })
}
```

---

## Acceptance Criteria

1. Ticketer app loads and functions when device goes offline
2. Ticketer can browse cached trips and see seat availability
3. Ticketer can create a booking offline (generates code, QR, prints ticket)
4. Multiple offline bookings can be created without conflicts between each other
5. When connectivity returns, all offline bookings sync automatically
6. Duplicate syncs (same offline_id) are handled idempotently
7. Seat conflicts show alternative suggestions and let user resolve
8. Offline indicator clearly shows when the app is offline
9. Data freshness is displayed (e.g., "Last synced: 2 hours ago")
10. Prefetch downloads enough data for a full day of offline operation
11. Printed tickets from offline bookings are valid and scannable after sync
12. GPS positions buffer locally and sync when online

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking)
- Skill 07 (Hardware) — for offline printing

## Blocks
- None (this is an enhancement layer)
