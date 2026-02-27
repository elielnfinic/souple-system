# Skill 03: Fleet & Vehicle Management

## Objective
Enable organizations and independent drivers to manage their vehicles, define custom seat layouts with different seat classes and pricing, and provide a visual seat layout editor and viewer for booking.

## Prerequisites
- Skill 01 (Foundation) completed
- S3/MinIO configured for file uploads

---

## Scope

### 1. Database Migrations

#### `seat_classes`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
name                  VARCHAR(50)             -- 'VIP', 'Economy', 'Business'
slug                  VARCHAR(50) UNIQUE
description           TEXT NULL
default_multiplier    DECIMAL(4,2) DEFAULT 1.00
color                 VARCHAR(7) NULL         -- Hex color for UI '#FFD700'
icon                  VARCHAR(50) NULL        -- Icon name for UI
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `vehicles`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
owner_user_id         BIGINT UNSIGNED FK -> users.id
type                  VARCHAR(50)             -- 'minibus', 'bus', 'sedan', 'van', 'pickup'
brand                 VARCHAR(50)
model                 VARCHAR(50)
year                  SMALLINT NULL
color                 VARCHAR(30)
plate_number          VARCHAR(20) UNIQUE
chassis_number        VARCHAR(50) UNIQUE NULL
total_seats           SMALLINT
visibility            ENUM('public', 'private') DEFAULT 'public'
is_available_for_rental BOOLEAN DEFAULT false
verification_status   ENUM('pending', 'verified', 'rejected') DEFAULT 'pending'
is_active             BOOLEAN DEFAULT true
rating                DECIMAL(3,2) DEFAULT 5.00
total_trips           INT DEFAULT 0
features              JSON NULL               -- ["ac", "wifi", "usb", "gps"]
photos                JSON NULL               -- [{url, key, is_primary}]
insurance_expiry      DATE NULL
technical_visit_expiry DATE NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id)
INDEX(owner_user_id)
INDEX(visibility)
INDEX(verification_status)
```

#### `seat_layouts`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
name                  VARCHAR(100)
rows                  TINYINT
columns               TINYINT
layout_data           JSON                    -- Full layout definition
is_default            BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(vehicle_id)
```

**`layout_data` JSON Schema:**
```json
{
  "seats": [
    {
      "id": "A1",
      "row": 0,
      "col": 0,
      "type": "driver|seat|aisle|door|luggage|empty",
      "class": "vip|economy|business|null",
      "bookable": true,
      "label": "VIP 1",
      "price_multiplier": 1.5,
      "features": ["window", "legroom", "power_outlet"],
      "position_3d": { "x": 0, "y": 0, "z": 0 }
    }
  ],
  "dimensions": {
    "width": 2.5,
    "length": 12.0,
    "height": 2.2
  },
  "legend": {
    "vip": { "color": "#FFD700", "label": "VIP" },
    "economy": { "color": "#4A90D9", "label": "Economique" },
    "business": { "color": "#8B5CF6", "label": "Business" }
  }
}
```

---

### 2. API Endpoints

#### Vehicles
```
GET    /api/v1/vehicles                       # List vehicles (filtered by org, visibility)
POST   /api/v1/vehicles                       # Create vehicle
GET    /api/v1/vehicles/:id                   # Get vehicle details
PUT    /api/v1/vehicles/:id                   # Update vehicle
DELETE /api/v1/vehicles/:id                   # Soft-delete vehicle
POST   /api/v1/vehicles/:id/photos            # Upload photos
DELETE /api/v1/vehicles/:id/photos/:key       # Delete photo
PUT    /api/v1/vehicles/:id/verify            # Admin verify/reject vehicle
GET    /api/v1/vehicles/:id/availability      # Check availability for date range
```

#### Seat Layouts
```
GET    /api/v1/vehicles/:vehicleId/seat-layouts          # List layouts for vehicle
POST   /api/v1/vehicles/:vehicleId/seat-layouts          # Create layout
GET    /api/v1/vehicles/:vehicleId/seat-layouts/:id      # Get layout detail
PUT    /api/v1/vehicles/:vehicleId/seat-layouts/:id      # Update layout
DELETE /api/v1/vehicles/:vehicleId/seat-layouts/:id      # Delete layout
PUT    /api/v1/vehicles/:vehicleId/seat-layouts/:id/default  # Set as default
```

#### Seat Classes (Admin)
```
GET    /api/v1/seat-classes                   # List all seat classes
POST   /api/v1/seat-classes                   # Create seat class
PUT    /api/v1/seat-classes/:id               # Update seat class
DELETE /api/v1/seat-classes/:id               # Delete seat class
```

---

### 3. Backend Services

#### VehicleService
```typescript
class VehicleService {
  async create(data: CreateVehicleData, userId: number, orgId?: number): Promise<Vehicle>
  async update(vehicleId: number, data: UpdateVehicleData): Promise<Vehicle>
  async uploadPhotos(vehicleId: number, files: MultipartFile[]): Promise<void>
  async verify(vehicleId: number, status: 'verified' | 'rejected', notes?: string): Promise<void>
  async checkAvailability(vehicleId: number, startDate: DateTime, endDate: DateTime): Promise<boolean>
  async listByOrganization(orgId: number, filters: VehicleFilters): Promise<Vehicle[]>
  async listPublic(filters: PublicVehicleFilters): Promise<Vehicle[]>
}
```

#### SeatLayoutService
```typescript
class SeatLayoutService {
  async create(vehicleId: number, data: CreateLayoutData): Promise<SeatLayout>
  async update(layoutId: number, data: UpdateLayoutData): Promise<SeatLayout>
  async validateLayout(layoutData: LayoutData): ValidationResult  // Validate JSON structure
  async setDefault(vehicleId: number, layoutId: number): Promise<void>
  async getLayoutForBooking(layoutId: number): Promise<BookingLayoutView> // Simplified for passenger view
}
```

---

### 4. Validators (VineJS)

```typescript
// app/validators/vehicle_validator.ts
export const createVehicleValidator = vine.compile(
  vine.object({
    type: vine.enum(['minibus', 'bus', 'sedan', 'van', 'pickup']),
    brand: vine.string().maxLength(50),
    model: vine.string().maxLength(50),
    year: vine.number().min(1990).max(2030).optional(),
    color: vine.string().maxLength(30),
    plate_number: vine.string().maxLength(20).unique({ table: 'vehicles', column: 'plate_number' }),
    total_seats: vine.number().min(1).max(100),
    visibility: vine.enum(['public', 'private']).optional(),
    is_available_for_rental: vine.boolean().optional(),
    features: vine.array(vine.string()).optional(),
  })
)

// app/validators/seat_layout_validator.ts
export const createSeatLayoutValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(100),
    rows: vine.number().min(1).max(30),
    columns: vine.number().min(1).max(10),
    layout_data: vine.object({
      seats: vine.array(vine.object({
        id: vine.string(),
        row: vine.number(),
        col: vine.number(),
        type: vine.enum(['driver', 'seat', 'aisle', 'door', 'luggage', 'empty']),
        class: vine.enum(['vip', 'economy', 'business']).nullable().optional(),
        bookable: vine.boolean(),
        label: vine.string().nullable().optional(),
        price_multiplier: vine.number().min(0).max(10).optional(),
        features: vine.array(vine.string()).optional(),
      })),
      legend: vine.record(vine.object({
        color: vine.string(),
        label: vine.string(),
      })).optional(),
    }),
  })
)
```

---

### 5. Frontend Components

#### Vehicle Management (Agency Dashboard)
- **VehicleList** — Table/grid of vehicles with filters (type, status, visibility)
- **VehicleForm** — Create/edit vehicle form with photo upload (drag & drop)
- **VehicleDetail** — Full vehicle info with seat layout preview
- **VehicleVerification** — Admin review panel (verify/reject with notes)

#### Seat Layout Editor (Agency Dashboard)
- **SeatLayoutEditor** — Interactive grid-based editor
  - Drag & drop seat placement on grid
  - Click to configure each cell (type, class, features)
  - Real-time preview of the layout
  - Color-coded by seat class
  - Save/load layout configurations
  - Validate layout (at least 1 driver, bookable seats match total_seats)

#### Seat Layout Viewer (Booking Flow)
- **SeatSelector2D** — Interactive 2D SVG/Canvas view
  - Color-coded seats by class
  - Click to select/deselect seats
  - Shows availability status (available, reserved, booked)
  - Hover tooltip with seat details (class, price, features)
  - Legend showing class colors and prices

- **SeatSelector3D** — Optional 3D Three.js view
  - 3D car interior model
  - Clickable seats
  - Camera orbit controls
  - Visual distinction by seat class
  - Uses `@react-three/fiber` + `@react-three/drei`
  - Progressive enhancement: falls back to 2D if WebGL unavailable

---

## Acceptance Criteria

1. Manager can create a vehicle with photos, it appears in fleet list
2. Manager can create a seat layout using the visual editor
3. Seat layout renders correctly in 2D viewer with class colors
4. Independent driver can register and add their own vehicle
5. Super admin can verify or reject a vehicle
6. Vehicle photos upload to S3 and display correctly
7. Seat layout JSON validation catches invalid configurations
8. Multiple seat layouts per vehicle, one set as default
9. Vehicle visibility (public/private) filters work correctly
10. Vehicle availability check considers existing trips and fleet bookings

---

## Dependencies
- Skill 01 (Foundation)

## Blocks
- Skill 04 (Trips & Booking) needs vehicles + seat layouts
- Skill 12 (Marketplace) needs vehicle visibility
