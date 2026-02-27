# Skill 07: Hardware Integration

## Objective
Enable seamless integration with portable ticket printers (Bluetooth/USB thermal printers), GPS tracking for vehicles, and camera-based barcode/QR scanners for parcels and ticket check-in.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed (for ticket data)
- Redis configured (for real-time GPS caching)
- A Bluetooth thermal printer for testing (e.g., Rongta RPP02N, MUNBYN IMP001)
- A device with camera for scanner testing

---

## Scope

### 1. Database Migrations

#### `gps_tracking_logs`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
trip_id               BIGINT UNSIGNED FK -> trips.id NULL
latitude              DECIMAL(10,8)
longitude             DECIMAL(11,8)
altitude_m            DECIMAL(7,2) NULL
speed_kmh             DECIMAL(6,2) NULL
heading               DECIMAL(5,2) NULL
accuracy_m            DECIMAL(6,2) NULL
source                ENUM('phone', 'hardware', 'manual') DEFAULT 'phone'
recorded_at           TIMESTAMP
created_at            TIMESTAMP
INDEX(vehicle_id, recorded_at)
INDEX(trip_id, recorded_at)
```
**Note**: This is an append-only, high-volume table. Partition by month for performance. Consider archiving to cold storage after 6 months.

#### `printer_configs` (optional, for org-level printer settings)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id
name                  VARCHAR(100)
type                  ENUM('bluetooth', 'usb', 'network')
paper_width_mm        SMALLINT DEFAULT 58     -- 58mm or 80mm
char_per_line         SMALLINT DEFAULT 32
header_text           TEXT NULL               -- Custom header printed on tickets
footer_text           TEXT NULL
logo_enabled          BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

---

### 2. GPS Tracking

#### API Endpoints
```
# Driver sends position updates
POST   /api/v1/gps/track                        # Send GPS position (batch supported)

# Real-time position (SSE)
GET    /api/v1/gps/vehicles/:id/live             # SSE stream of vehicle position
GET    /api/v1/gps/trips/:id/live                # SSE stream of trip vehicle position

# Position history
GET    /api/v1/gps/vehicles/:id/history          # GPS history for date range
GET    /api/v1/gps/trips/:id/track               # Full GPS track for a trip

# Hardware tracker webhooks (for Teltonika, Queclink, etc.)
POST   /api/v1/gps/webhooks/:provider            # GPS hardware tracker data ingestion
```

#### GPS Service (Backend)
```typescript
// app/services/gps_service.ts
export class GpsService {
  async recordPosition(data: {
    vehicleId: number
    tripId?: number
    latitude: number
    longitude: number
    speed?: number
    heading?: number
    accuracy?: number
    source: 'phone' | 'hardware'
    recordedAt: DateTime
  }): Promise<void> {
    // 1. Write to Redis for real-time: SET gps:vehicle:{id} {lat,lng,speed,heading,ts} EX 300
    // 2. Batch insert to gps_tracking_logs (buffer in memory, flush every 10s or 50 records)
    // 3. Publish to Redis pub/sub channel: gps:vehicle:{id}:updates
  }

  async recordBatch(positions: GpsPosition[]): Promise<void> {
    // Bulk insert for hardware trackers that send batches
  }

  async getLivePosition(vehicleId: number): Promise<GpsPosition | null> {
    // Read from Redis: GET gps:vehicle:{vehicleId}
  }

  async streamLivePosition(vehicleId: number, ctx: HttpContext): Promise<void> {
    // Server-Sent Events:
    // 1. Send current position from Redis
    // 2. Subscribe to Redis pub/sub: gps:vehicle:{id}:updates
    // 3. Forward each update as SSE event
    // 4. Set appropriate headers: Content-Type: text/event-stream
    // 5. Handle client disconnect: unsubscribe from pub/sub
  }

  async getHistory(vehicleId: number, from: DateTime, to: DateTime): Promise<GpsPosition[]> {
    // Query gps_tracking_logs table
    // Optionally downsample for large time ranges (every Nth point)
  }

  async getTripTrack(tripId: number): Promise<GpsPosition[]> {
    // Get all GPS points for a specific trip
    // Return ordered by recorded_at
  }
}
```

#### Driver GPS (Frontend)
```typescript
// lib/gps-tracker.ts
export class GpsTracker {
  private watchId: number | null = null
  private buffer: GpsPosition[] = []
  private flushInterval: number

  async start(tripId?: number): Promise<void> {
    // 1. Check permission: navigator.geolocation
    // 2. Start watching position with high accuracy
    // 3. Buffer positions, send to API every 15 seconds
    // 4. Continue sending even if app is in background (requires keep-alive)
  }

  stop(): void {
    // Stop watching, flush remaining buffer
  }

  private async flush(): Promise<void> {
    // POST /api/v1/gps/track with batch of positions
    // On failure: store in IndexedDB, retry later
  }
}
```

---

### 3. Ticket Printer Integration

#### Printer Driver (Frontend)
```typescript
// lib/printer-driver.ts
export class TicketPrinterDriver {
  private connection: BluetoothConnection | UsbConnection | null = null
  private config: PrinterConfig

  /**
   * Connect to printer via Web Bluetooth API
   */
  async connectBluetooth(): Promise<boolean> {
    // 1. navigator.bluetooth.requestDevice({ filters for thermal printers })
    // 2. Connect to GATT server
    // 3. Find print service and characteristic
    // 4. Store connection reference
    // Common service UUIDs:
    //   - '000018f0-0000-1000-8000-00805f9b34fb' (generic thermal)
    //   - '49535343-fe7d-4ae5-8fa9-9fafd205e455' (some printers)
  }

  /**
   * Connect via Web USB API
   */
  async connectUsb(): Promise<boolean> {
    // 1. navigator.usb.requestDevice({ filters })
    // 2. Open device, select configuration, claim interface
  }

  /**
   * Print a formatted ticket
   */
  async printTicket(ticket: TicketData): Promise<void> {
    const commands = this.buildEscPosCommands(ticket)
    await this.sendRawBytes(commands)
  }

  /**
   * Build ESC/POS commands for a ticket
   */
  private buildEscPosCommands(ticket: TicketData): Uint8Array {
    const builder = new EscPosBuilder(this.config.charPerLine)

    builder
      .initialize()                           // ESC @
      .setAlignment('center')                 // ESC a 1
      .setBold(true)
      .setDoubleSize(true)
      .text(ticket.organizationName)          // "SOUPLE TRANSPORT"
      .setDoubleSize(false)
      .setBold(false)
      .lineFeed()

      // Route
      .setAlignment('center')
      .setBold(true)
      .text(`${ticket.fromCity} → ${ticket.toCity}`)
      .setBold(false)
      .lineFeed()

      // Separator
      .text('─'.repeat(this.config.charPerLine))
      .lineFeed()

      // Details
      .setAlignment('left')
      .text(`Passager: ${ticket.passengerName}`)
      .text(`Date:     ${ticket.departureDate}`)
      .text(`Heure:    ${ticket.departureTime}`)
      .text(`Siege(s): ${ticket.seatLabels.join(', ')}`)
      .text(`Classe:   ${ticket.seatClass}`)
      .lineFeed()

      // Price
      .text('─'.repeat(this.config.charPerLine))
      .setBold(true)
      .setDoubleSize(true)
      .setAlignment('center')
      .text(`${ticket.totalAmount} ${ticket.currency}`)
      .setDoubleSize(false)
      .setBold(false)
      .lineFeed()

      // QR Code
      .setAlignment('center')
      .qrCode(ticket.bookingCode, { size: 6 }) // ESC/POS QR code command
      .text(ticket.bookingCode)
      .lineFeed()

      // Footer
      .text('─'.repeat(this.config.charPerLine))
      .setAlignment('center')
      .text(ticket.footerText || 'Merci et bon voyage!')
      .text(`Ref: ${ticket.bookingCode}`)
      .lineFeed(3)
      .cut()                                    // GS V (partial cut)

    return builder.build()
  }

  /**
   * Print test page
   */
  async printTest(): Promise<void> {
    // Print a test page with alignment, bold, QR code
    // Useful for verifying printer connection
  }

  /**
   * Get printer status
   */
  async getStatus(): Promise<PrinterStatus> {
    // Query printer for paper status, battery, etc.
  }
}

/**
 * ESC/POS command builder utility
 */
class EscPosBuilder {
  private buffer: number[] = []

  initialize(): this { /* ESC @ */ }
  text(content: string): this { /* Encode and append */ }
  lineFeed(lines?: number): this { /* LF */ }
  setAlignment(align: 'left' | 'center' | 'right'): this { /* ESC a n */ }
  setBold(on: boolean): this { /* ESC E n */ }
  setDoubleSize(on: boolean): this { /* GS ! n */ }
  setFontSize(width: number, height: number): this { /* GS ! n */ }
  qrCode(data: string, options?: QrOptions): this { /* GS ( k */ }
  barcode(data: string, type: BarcodeType): this { /* GS k */ }
  cut(partial?: boolean): this { /* GS V */ }
  image(bitmap: Uint8Array, width: number): this { /* GS v 0 */ }
  build(): Uint8Array { return new Uint8Array(this.buffer) }
}
```

---

### 4. Barcode/QR Scanner

#### Scanner Driver (Frontend)
```typescript
// lib/scanner-driver.ts
export class ScannerDriver {
  private scanner: Html5QrcodeScanner | null = null

  /**
   * Start camera-based scanner
   */
  async startCameraScanner(elementId: string, onScan: ScanCallback): Promise<void> {
    // Uses html5-qrcode library
    // Supports: QR, Code128, EAN-13, Code39, etc.
    // Configurable: front/back camera, scan area, fps
  }

  /**
   * Stop scanner
   */
  async stop(): Promise<void>

  /**
   * Handle scan result
   * Routes to appropriate action based on scanned data type
   */
  processScanResult(data: string): ScanAction {
    if (data.startsWith('SP-')) {
      return { type: 'booking', bookingCode: data }
    }
    if (data.startsWith('PCL-')) {
      return { type: 'parcel', trackingCode: data }
    }
    return { type: 'unknown', rawData: data }
  }
}
```

#### Hardware Scanner Support
USB barcode scanners emit keyboard events. No special driver needed:
```typescript
// hooks/useHardwareScanner.ts
export function useHardwareScanner(onScan: (data: string) => void) {
  // Listen for rapid keypress sequences ending in Enter
  // Buffer chars, if > 5 chars in < 100ms, treat as scanner input
  // Call onScan with the buffered string
}
```

---

### 5. Parcel Management

#### Database Migration: `parcels`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
trip_id               BIGINT UNSIGNED FK -> trips.id
sender_name           VARCHAR(200)
sender_phone          VARCHAR(20)
receiver_name         VARCHAR(200)
receiver_phone        VARCHAR(20)
description           TEXT NULL
weight_kg             DECIMAL(6,2) NULL
dimensions            JSON NULL               -- { length, width, height in cm }
barcode               VARCHAR(100) UNIQUE
tracking_code         VARCHAR(20) UNIQUE      -- 'PCL-XXXXXXXX'
price                 DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'CDF'
status                ENUM('registered', 'in_transit', 'at_destination', 'delivered', 'returned') DEFAULT 'registered'
registered_by_id      BIGINT UNSIGNED FK -> users.id
delivered_to          VARCHAR(200) NULL       -- Name of person who received
delivered_at          TIMESTAMP NULL
qr_code_data          VARCHAR(500)
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(barcode)
INDEX(tracking_code)
INDEX(trip_id)
INDEX(sender_phone)
INDEX(receiver_phone)
INDEX(status)
```

#### `parcel_events` (tracking history)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
parcel_id             BIGINT UNSIGNED FK -> parcels.id
status                VARCHAR(50)
location              VARCHAR(200) NULL
notes                 TEXT NULL
scanned_by_id         BIGINT UNSIGNED FK -> users.id NULL
created_at            TIMESTAMP
INDEX(parcel_id)
```

#### API Endpoints
```
GET    /api/v1/parcels                           # List parcels (filtered)
POST   /api/v1/parcels                           # Register parcel
GET    /api/v1/parcels/:id                       # Get parcel details
PUT    /api/v1/parcels/:id                       # Update parcel
POST   /api/v1/parcels/:id/scan                  # Scan event (status update)
GET    /api/v1/parcels/track/:code               # Public: track by code
GET    /api/v1/parcels/:id/events                # Get tracking history
```

---

### 6. Frontend Components

#### Printer Management
- **PrinterConnection** — Connect/disconnect to Bluetooth or USB printer
- **PrinterStatus** — Show connection status, paper level, battery
- **PrintTestPage** — Test print button
- **PrinterSettings** — Configure paper width, header/footer text, logo

#### GPS Tracking Map
- **LiveTrackingMap** — Map showing real-time vehicle position (Leaflet or Mapbox)
  - Vehicle marker with direction indicator
  - Route polyline
  - Stop markers
  - Auto-center on vehicle
  - Speed display
- **TripTrackReplay** — Replay a completed trip's GPS track
- **FleetMap** — Show all active vehicles on a single map (for manager)
- **DriverGpsToggle** — Driver enables/disables GPS tracking

#### Scanner Interface
- **CameraScanner** — Camera-based QR/barcode scanner with viewfinder
- **ScanResult** — Display scan result with action buttons
- **ParcelScanner** — Specialized scanner for parcel workflow
  - Scan → Show parcel info → Update status → Confirm

#### Parcel Management
- **ParcelForm** — Register new parcel (sender, receiver, description, weight, price)
- **ParcelList** — List parcels with status badges and filters
- **ParcelDetail** — Full parcel info with tracking timeline
- **ParcelTracker** — Public tracking page (by tracking code)
- **ParcelLabel** — Printable label with barcode/QR

---

## Acceptance Criteria

1. Driver's GPS position updates appear on the tracking map in real-time (< 5s latency)
2. GPS data is stored and can be replayed for completed trips
3. Bluetooth printer connects and prints a formatted ticket with QR code
4. USB printer connects as fallback when Bluetooth unavailable
5. Camera scanner reads QR codes and barcodes reliably
6. Hardware USB scanner input is detected and processed
7. Parcel can be registered, scanned at each checkpoint, and tracked publicly
8. Parcel status changes trigger SMS notifications to sender and receiver
9. Printer works offline (prints from cached booking data)
10. Fleet map shows all active vehicles for the organization
11. GPS tracking respects driver privacy (explicit toggle, stops when trip completed)

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking)
- Skill 06 (Notifications) — for parcel notifications

## Blocks
- Skill 08 (Offline) — offline printing capability
