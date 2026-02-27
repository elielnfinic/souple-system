# Skill 10: KYC & Security

## Objective
Implement a Know Your Customer (KYC) verification system with document upload and review workflow. Harden the application security with comprehensive RBAC enforcement, data encryption, CORS, CSRF, and a powerful audit log viewer. Organizations and drivers can require specific KYC levels from their customers.

## Prerequisites
- Skill 01 (Foundation) completed — auth + RBAC basics
- S3/MinIO configured for document storage

---

## Scope

### 1. Database Migrations

#### `kyc_levels`
```
id                    TINYINT UNSIGNED PK
name                  VARCHAR(50)             -- 'none', 'basic', 'full'
label                 VARCHAR(100)            -- 'Aucune vérification', 'Vérification de base', 'Vérification complète'
description           TEXT
requirements          JSON                    -- List of required document types
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

Seed data:
```
id=0: name='none',  requirements=[]
id=1: name='basic', requirements=['identity_card|passport|driver_license']
id=2: name='full',  requirements=['identity_card|passport|driver_license', 'selfie', 'proof_of_address']
```

#### `kyc_documents`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
type                  ENUM('identity_card', 'passport', 'driver_license', 'selfie', 'proof_of_address', 'vehicle_registration')
file_url              VARCHAR(500)
file_key              VARCHAR(255)            -- S3 key for deletion
file_size_bytes       INT NULL
mime_type             VARCHAR(50) NULL
status                ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
reviewer_id           BIGINT UNSIGNED FK -> users.id NULL
review_notes          TEXT NULL
rejection_reason      TEXT NULL
reviewed_at           TIMESTAMP NULL
expires_at            DATE NULL               -- Some documents expire
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(user_id, type)
INDEX(status)
```

#### Add `kyc_level` column to `users` table
```
ALTER TABLE users ADD kyc_level TINYINT UNSIGNED DEFAULT 0 AFTER phone_verified_at;
ALTER TABLE users ADD kyc_verified_at TIMESTAMP NULL AFTER kyc_level;
```

#### `security_events` (login attempts, suspicious activity)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id NULL
event_type            ENUM('login_success', 'login_failed', 'password_changed', 'token_revoked',
                           'otp_requested', 'otp_failed', 'account_locked', 'suspicious_activity')
ip_address            VARCHAR(45)
user_agent            TEXT NULL
metadata              JSON NULL               -- Extra context
created_at            TIMESTAMP
INDEX(user_id, created_at)
INDEX(event_type, created_at)
INDEX(ip_address, created_at)
```

---

### 2. API Endpoints

#### KYC
```
# User submits KYC documents
POST   /api/v1/kyc/documents                    # Upload KYC document
GET    /api/v1/kyc/documents                    # List my documents
GET    /api/v1/kyc/status                       # My KYC status and level
DELETE /api/v1/kyc/documents/:id                 # Delete (only if pending)

# Admin reviews KYC
GET    /api/v1/admin/kyc/queue                  # List pending KYC documents
GET    /api/v1/admin/kyc/documents/:id           # View document detail
POST   /api/v1/admin/kyc/documents/:id/approve   # Approve document
POST   /api/v1/admin/kyc/documents/:id/reject    # Reject document with reason
GET    /api/v1/admin/kyc/stats                  # KYC review statistics
```

#### Audit Logs
```
GET    /api/v1/audit-logs                       # List audit logs (filtered)
GET    /api/v1/audit-logs/:id                   # View audit log detail
GET    /api/v1/audit-logs/export                # Export audit logs as CSV
GET    /api/v1/audit-logs/stats                 # Audit statistics (actions by type, by user)
```

#### Security
```
GET    /api/v1/security/events                  # My security events
GET    /api/v1/admin/security/events            # All security events (super admin)
POST   /api/v1/security/sessions                # List active sessions
DELETE /api/v1/security/sessions/:id            # Revoke a session
POST   /api/v1/security/change-password          # Change password
```

---

### 3. KYC Service

```typescript
// app/services/kyc_service.ts
export class KycService {
  /**
   * Upload a KYC document
   */
  async submitDocument(userId: number, type: string, file: MultipartFile): Promise<KycDocument> {
    // 1. Validate file (max 10MB, allowed types: jpg, png, pdf)
    // 2. Upload to S3 (private bucket, not publicly accessible)
    // 3. Create KycDocument record (status: pending)
    // 4. Check if user has submitted all required docs for next level
    // 5. If all docs approved → upgrade user.kyc_level
  }

  /**
   * Review a document (admin action)
   */
  async reviewDocument(documentId: number, reviewerId: number, decision: 'approved' | 'rejected', notes?: string): Promise<KycDocument> {
    // 1. Update document status
    // 2. Record reviewer and notes
    // 3. Recalculate user's KYC level:
    //    - Check all documents for user
    //    - Determine highest level where ALL required docs are approved
    //    - Update user.kyc_level
    // 4. Emit KycReviewed event → notification to user
  }

  /**
   * Check if user meets org's KYC requirement
   */
  async checkKycLevel(userId: number, requiredLevel: number): Promise<KycCheckResult> {
    const user = await User.find(userId)
    return {
      meets: user.kycLevel >= requiredLevel,
      currentLevel: user.kycLevel,
      requiredLevel,
      missingDocuments: await this.getMissingDocuments(userId, requiredLevel),
    }
  }

  /**
   * Get documents a user still needs to submit for a given level
   */
  async getMissingDocuments(userId: number, targetLevel: number): Promise<string[]> {
    // Compare required docs for targetLevel with user's approved docs
  }

  /**
   * Auto-check for expired documents
   */
  async checkExpiredDocuments(): Promise<void> {
    // Find documents where expires_at < now
    // Downgrade user's KYC level
    // Notify user to re-upload
  }
}
```

---

### 4. KYC Enforcement in Booking Flow

```typescript
// app/middleware/kyc_middleware.ts
// Applied to booking creation endpoint

export default class KycMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user!
    const organization = ctx.organization

    if (organization && organization.requiredKycLevel > 0) {
      const check = await kycService.checkKycLevel(user.id, organization.requiredKycLevel)
      if (!check.meets) {
        throw new KycRequiredException({
          currentLevel: check.currentLevel,
          requiredLevel: check.requiredLevel,
          missingDocuments: check.missingDocuments,
        })
      }
    }

    return next()
  }
}
```

---

### 5. Audit Log Viewer

```typescript
// app/services/audit_service.ts
export class AuditService {
  async query(filters: {
    organizationId?: number
    userId?: number
    entityType?: string
    entityId?: number
    action?: string
    dateFrom?: DateTime
    dateTo?: DateTime
    page?: number
    perPage?: number
  }): Promise<PaginatedResult<AuditLog>> {
    // Full-text search on action
    // Join user for name display
    // Return paginated results with user info
  }

  async getStats(organizationId?: number, period?: string): Promise<AuditStats> {
    // Actions count by type
    // Most active users
    // Peak activity times
  }

  async export(filters: AuditFilters): Promise<Buffer> {
    // Export as CSV with all fields
  }
}
```

---

### 6. Security Hardening

#### AdonisJS Shield Configuration
```typescript
// config/shield.ts
export default defineConfig({
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Adjust for Next.js
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 's3-bucket-url'],
      connectSrc: ["'self'", 'api-url', 'wss:'],
    },
  },
  xFrame: 'DENY',
  hsts: { enabled: true, maxAge: '365 days', includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
})
```

#### CORS Configuration
```typescript
// config/cors.ts
export default defineConfig({
  enabled: true,
  origin: (requestOrigin) => {
    return ['https://app.souple.com', 'http://localhost:3000'].includes(requestOrigin)
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  credentials: true,
})
```

#### Account Lockout
```typescript
// app/services/security_service.ts
export class SecurityService {
  async recordLoginAttempt(userId: number | null, ip: string, success: boolean): Promise<void> {
    // Record security event
    // If 5 failed attempts in 15 minutes from same IP → lock out IP for 30 min
    // If 5 failed attempts for same user → lock account for 30 min
    // Use Redis for rate counters
  }

  async isLocked(userId?: number, ip?: string): Promise<boolean>

  async revokeAllSessions(userId: number): Promise<void> {
    // Delete all access tokens for user
  }
}
```

#### Input Sanitization
```typescript
// All user inputs already go through VineJS validation
// Additional measures:
// - Strip HTML from text fields (via custom VineJS rule)
// - Limit file upload sizes per type
// - Validate file MIME types (don't trust extension alone)
// - Parameterized queries only (Lucid ORM handles this)
```

#### Sensitive Data Handling
```typescript
// KYC documents stored in private S3 bucket
// Access via pre-signed URLs (expire in 5 minutes)
// Never expose S3 URLs directly

// Payment data: never store full card numbers
// Stripe handles PCI compliance via client-side tokenization
// Mobile money: only store phone number + provider reference

// Passwords: bcrypt with cost factor 12
// OTPs: stored in Redis with TTL, hashed with SHA-256
```

---

### 7. Frontend Components

#### KYC Flow (Passenger/Driver)
- **KycStatus** — Shows current KYC level with progress indicator
- **KycDocumentUpload** — Upload form per document type (camera capture + file upload)
- **KycDocumentList** — List submitted documents with status badges
- **KycRequired** — Block screen when booking requires higher KYC (explains what's needed)

#### KYC Admin Review (Super Admin)
- **KycReviewQueue** — Table of pending documents with filters
- **KycDocumentViewer** — View uploaded document (image viewer with zoom)
- **KycReviewActions** — Approve/reject buttons with notes field
- **KycStats** — Dashboard widget: pending count, approved/rejected today

#### Audit Log Viewer (Super Admin / Manager)
- **AuditLogTable** — Sortable, filterable table of audit events
  - Filters: date range, user, action type, entity type
  - Search by entity ID
  - Expandable rows showing old/new values diff
- **AuditLogDetail** — Full detail view with JSON diff visualization
- **AuditStats** — Charts: actions by type, by user, by time of day
- **AuditExport** — Export filtered results as CSV

#### Security Settings (User)
- **ActiveSessions** — List of active sessions (device, IP, last active)
- **RevokeSession** — Revoke individual session
- **ChangePassword** — Password change form
- **SecurityEvents** — Recent login history (success/failure)

---

## Acceptance Criteria

1. User can upload KYC documents (ID, selfie, proof of address)
2. Uploaded documents are stored securely in private S3 bucket
3. Admin can review and approve/reject KYC documents
4. User's KYC level auto-updates when all required docs are approved
5. Booking for an org with KYC requirement is blocked if user's level is insufficient
6. KYC rejection shows clear reason and allows re-upload
7. Audit logs capture all mutations with old/new values
8. Audit log viewer filters work (by date, user, entity type, action)
9. Audit log export produces valid CSV
10. Failed login attempts trigger account lockout after 5 failures
11. CORS, CSP, and security headers are properly configured
12. Active sessions can be viewed and revoked
13. Expired KYC documents trigger re-verification notification

---

## Dependencies
- Skill 01 (Foundation) — auth, RBAC, audit middleware

## Blocks
- Skill 04 (Trips & Booking) — uses KYC check in booking flow
