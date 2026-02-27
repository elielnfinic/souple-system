# Skill 22: Vehicle Maintenance & Compliance

## Objective
Track vehicle maintenance schedules, roadworthiness certificates, insurance documents, and mileage. Block vehicles with expired compliance documents from creating trips. Help agencies manage fleet upkeep and reduce breakdowns.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 03 (Fleet & Vehicles) completed
- Skill 07 (Hardware — GPS for mileage) completed

---

## Scope

### 1. Database Migrations

#### `vehicle_documents`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
type                  ENUM('roadworthiness', 'insurance', 'registration', 'permit', 'other')
document_number       VARCHAR(100) NULL
file_url              VARCHAR(500) NULL
issued_at             DATE NULL
expires_at            DATE NULL
status                ENUM('valid', 'expiring_soon', 'expired', 'pending_renewal') DEFAULT 'valid'
notes                 TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(vehicle_id, type)
INDEX(expires_at, status)
```

#### `maintenance_records`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
type                  ENUM('oil_change', 'tire_change', 'brake_service', 'engine_repair',
                           'body_repair', 'inspection', 'general_service', 'other')
description           TEXT
cost                  DECIMAL(12,2) NULL
currency              VARCHAR(3) NULL
odometer_km           INT NULL
performed_by          VARCHAR(200) NULL         -- Mechanic / garage name
performed_at          DATE
next_due_km           INT NULL                  -- Next service at X km
next_due_date         DATE NULL                 -- Or next service by date
receipt_url           VARCHAR(500) NULL
notes                 TEXT NULL
created_by            BIGINT UNSIGNED FK -> users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(vehicle_id, performed_at)
INDEX(next_due_date)
```

#### `maintenance_alerts`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id
type                  ENUM('document_expiry', 'service_due_date', 'service_due_km')
title                 VARCHAR(255)
due_date              DATE NULL
due_km                INT NULL
is_dismissed          BOOLEAN DEFAULT false
notified_at           TIMESTAMP NULL
created_at            TIMESTAMP
INDEX(vehicle_id, is_dismissed)
INDEX(due_date)
```

### 2. Maintenance Service

```typescript
// app/services/maintenance_service.ts
export class MaintenanceService {
  async checkVehicleCompliance(vehicleId: number): Promise<ComplianceStatus> {
    // 1. Load all vehicle_documents
    // 2. Check each required doc type: roadworthiness, insurance, registration
    // 3. Return: { compliant: boolean, issues: [{type, status, expiresAt}] }
    // 4. If any required doc is expired → vehicle cannot create trips
  }

  async generateAlerts(): Promise<void> {
    // Cron job (daily):
    // 1. Documents expiring in 30 days → create alert + notify org
    // 2. Documents expiring in 7 days → high priority alert
    // 3. Documents expired → block vehicle, notify org
    // 4. Maintenance due by date (within 7 days) → alert
    // 5. Maintenance due by km (within 500 km, based on GPS mileage) → alert
  }

  async updateOdometerFromGPS(vehicleId: number): Promise<void> {
    // Calculate distance traveled from GPS logs
    // Update vehicle's current odometer reading
    // Check if any maintenance is due by km
  }
}
```

### 3. Compliance Blocking

```typescript
// Integration with Skill 04 (Trips):
// Before creating a trip, check vehicle compliance:
//
// if (!await maintenanceService.checkVehicleCompliance(vehicleId).compliant) {
//   throw new ValidationException('Vehicle has expired documents. Update before creating trips.')
// }
//
// Vehicle status automatically set to 'inactive' when critical docs expire
// Restored to 'active' when renewed docs uploaded and verified
```

### 4. API Endpoints

```
# Vehicle documents
GET    /api/v1/org/vehicles/:vehicleId/documents          # List documents
POST   /api/v1/org/vehicles/:vehicleId/documents          # Upload document
PUT    /api/v1/org/vehicles/:vehicleId/documents/:id      # Update
DELETE /api/v1/org/vehicles/:vehicleId/documents/:id      # Remove

# Maintenance records
GET    /api/v1/org/vehicles/:vehicleId/maintenance        # Maintenance history
POST   /api/v1/org/vehicles/:vehicleId/maintenance        # Log maintenance
PUT    /api/v1/org/vehicles/:vehicleId/maintenance/:id    # Update record

# Alerts
GET    /api/v1/org/maintenance/alerts                     # All alerts for org fleet
PUT    /api/v1/org/maintenance/alerts/:id/dismiss         # Dismiss alert

# Compliance check
GET    /api/v1/org/vehicles/:vehicleId/compliance         # Compliance status
GET    /api/v1/org/fleet/compliance                       # Fleet-wide compliance overview
```

### 5. Frontend Components

- **VehicleDocumentManager** — Upload/view/renew documents with expiry date tracking
- **MaintenanceLog** — Timeline of maintenance records per vehicle
- **MaintenanceForm** — Log service: type, cost, odometer, date, receipt upload, next due
- **ComplianceBadge** — Green/yellow/red badge on vehicle cards (compliant / expiring / expired)
- **FleetComplianceDashboard** — Overview of all vehicles with compliance status, upcoming expirations
- **MaintenanceAlertList** — Dismissable alert cards for upcoming/overdue maintenance

---

## Acceptance Criteria

1. Vehicle documents can be uploaded with type, number, and expiry date
2. Expired documents automatically block trip creation for that vehicle
3. Alerts generated 30 days and 7 days before document expiry
4. Maintenance records can be logged with cost, odometer, and next due date/km
5. Odometer auto-updates from GPS mileage tracking
6. Km-based maintenance alerts trigger when vehicle approaches due mileage
7. Fleet compliance dashboard shows all vehicles with status indicators
8. Notifications sent to org when documents expire or maintenance is due

---

## Dependencies
- Skill 01, 03
- Skill 07 (GPS) — mileage tracking

## Blocks
- None
