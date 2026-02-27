# Skill 23: Corporate & B2B Accounts

## Objective
Enable companies to manage employee travel through Souple with corporate accounts, travel policies, bulk booking, monthly invoicing, and negotiated rates. Target NGOs, mining companies, government offices, and businesses that regularly move staff between cities.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 05 (Payments) completed
- Skill 13 (Business Model) completed

---

## Context

In DRC, organizations like NGOs (MONUSCO, MSF), mining companies, government offices, and businesses frequently need to transport employees between cities. They want:
- Centralized booking and payment (company pays, not individuals)
- Travel policies (max budget per trip, approved routes)
- Monthly invoices instead of per-trip payments
- Negotiated discounted rates with agencies
- Expense reports and audit trails

---

## Scope

### 1. Database Migrations

#### `corporate_accounts`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
company_name          VARCHAR(200)
registration_number   VARCHAR(100) NULL
contact_person        VARCHAR(200)
contact_email         VARCHAR(255)
contact_phone         VARCHAR(20)
billing_email         VARCHAR(255)
billing_address       TEXT NULL
payment_terms         ENUM('prepaid', 'net_15', 'net_30') DEFAULT 'net_30'
credit_limit          DECIMAL(12,2) NULL         -- Max outstanding balance
current_balance       DECIMAL(12,2) DEFAULT 0    -- Current outstanding
currency              VARCHAR(3) DEFAULT 'USD'
status                ENUM('pending', 'active', 'suspended', 'closed') DEFAULT 'pending'
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `corporate_members`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
corporate_account_id  BIGINT UNSIGNED FK -> corporate_accounts.id
user_id               BIGINT UNSIGNED FK -> users.id
role                  ENUM('admin', 'booker', 'traveler') DEFAULT 'traveler'
employee_id           VARCHAR(50) NULL           -- Company's internal employee ID
department            VARCHAR(100) NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(corporate_account_id, user_id)
INDEX(user_id)
```

#### `travel_policies`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
corporate_account_id  BIGINT UNSIGNED FK -> corporate_accounts.id
name                  VARCHAR(200)
max_price_per_trip    DECIMAL(12,2) NULL
currency              VARCHAR(3) NULL
allowed_seat_classes  JSON NULL                  -- ['economy', 'business'] or NULL = all
allowed_routes        JSON NULL                  -- Route IDs or NULL = all
requires_approval     BOOLEAN DEFAULT false      -- Require manager approval before booking
advance_booking_days  INT NULL                   -- Must book X days in advance
is_default            BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(corporate_account_id)
```

#### `corporate_bookings`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
corporate_account_id  BIGINT UNSIGNED FK -> corporate_accounts.id
booking_id            BIGINT UNSIGNED FK -> bookings.id
booked_by             BIGINT UNSIGNED FK -> users.id        -- Who made the booking
traveler_user_id      BIGINT UNSIGNED FK -> users.id        -- Who is traveling
travel_policy_id      BIGINT UNSIGNED FK -> travel_policies.id NULL
purpose               VARCHAR(255) NULL           -- Travel purpose / project code
approval_status       ENUM('auto_approved', 'pending', 'approved', 'rejected') DEFAULT 'auto_approved'
approved_by           BIGINT UNSIGNED FK -> users.id NULL
cost_center           VARCHAR(100) NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(corporate_account_id, created_at)
INDEX(traveler_user_id)
```

#### `corporate_invoices`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
corporate_account_id  BIGINT UNSIGNED FK -> corporate_accounts.id
invoice_number        VARCHAR(50) UNIQUE
period_start          DATE
period_end            DATE
total_amount          DECIMAL(12,2)
currency              VARCHAR(3)
booking_count         INT
line_items            JSON                       -- [{booking_code, traveler, route, date, amount}]
status                ENUM('draft', 'sent', 'paid', 'overdue') DEFAULT 'draft'
due_date              DATE
paid_at               TIMESTAMP NULL
pdf_url               VARCHAR(500) NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(corporate_account_id, period_start)
INDEX(status, due_date)
```

#### `negotiated_rates`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
corporate_account_id  BIGINT UNSIGNED FK -> corporate_accounts.id
organization_id       BIGINT UNSIGNED FK -> organizations.id  -- Transport agency
discount_type         ENUM('percentage', 'fixed_price')
discount_value        DECIMAL(12,2)
applicable_routes     JSON NULL                  -- NULL = all routes
applicable_seat_classes JSON NULL
valid_from            DATE
valid_until           DATE NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(corporate_account_id, organization_id)
```

### 2. Corporate Service

```typescript
// app/services/corporate_service.ts
export class CorporateService {
  async bookForEmployee(params: {
    corporateAccountId: number
    bookedByUserId: number
    travelerUserId: number
    tripId: number
    seatIds: number[]
    purpose?: string
    costCenter?: string
  }): Promise<CorporateBooking> {
    // 1. Verify booker has 'admin' or 'booker' role
    // 2. Verify traveler is member of corporate account
    // 3. Check travel policy compliance (price, route, seat class, advance days)
    // 4. Apply negotiated rate if exists
    // 5. If policy requires approval: set approval_status = 'pending', notify approver
    // 6. If auto-approved: create booking, charge to corporate account balance
    // 7. Create corporate_booking record
  }

  async generateMonthlyInvoice(corporateAccountId: number, month: Date): Promise<CorporateInvoice> {
    // 1. Aggregate all corporate bookings for the month
    // 2. Apply negotiated rates
    // 3. Generate line items
    // 4. Create invoice with due date per payment_terms
    // 5. Generate PDF
    // 6. Send to billing_email
  }

  async checkCreditLimit(corporateAccountId: number, amount: number): Promise<boolean> {
    // Verify: current_balance + amount <= credit_limit
  }
}
```

### 3. API Endpoints

```
# Corporate account management
POST   /api/v1/corporate/register                 # Apply for corporate account
GET    /api/v1/corporate/account                  # My corporate account
PUT    /api/v1/corporate/account                  # Update account details

# Members
GET    /api/v1/corporate/members                  # List members
POST   /api/v1/corporate/members                  # Add member (by email/phone)
PUT    /api/v1/corporate/members/:id              # Update role
DELETE /api/v1/corporate/members/:id              # Remove member

# Travel policies
GET    /api/v1/corporate/policies                 # List policies
POST   /api/v1/corporate/policies                 # Create policy
PUT    /api/v1/corporate/policies/:id             # Update
DELETE /api/v1/corporate/policies/:id             # Delete

# Booking
POST   /api/v1/corporate/bookings                 # Book for employee
GET    /api/v1/corporate/bookings                 # All corporate bookings
POST   /api/v1/corporate/bookings/:id/approve     # Approve pending booking
POST   /api/v1/corporate/bookings/:id/reject      # Reject pending booking

# Invoices
GET    /api/v1/corporate/invoices                 # List invoices
GET    /api/v1/corporate/invoices/:id             # Invoice detail
GET    /api/v1/corporate/invoices/:id/pdf         # Download PDF

# Negotiated rates (admin + agency)
GET    /api/v1/corporate/rates                    # Active rates
POST   /api/v1/admin/corporate/rates              # Set negotiated rate

# Admin
GET    /api/v1/admin/corporate                    # All corporate accounts
PUT    /api/v1/admin/corporate/:id/approve        # Approve account
POST   /api/v1/admin/corporate/invoices/generate  # Trigger invoice generation
```

### 4. Frontend Components

- **CorporateRegistrationForm** — Company details, contact info, billing preferences
- **CorporateDashboard** — Monthly spend, active travelers, pending approvals, balance
- **MemberManager** — Add/remove employees, set roles (admin/booker/traveler)
- **PolicyEditor** — Create travel policies with rules and limits
- **CorporateBookingFlow** — Select traveler → search trip → book (with policy check)
- **ApprovalQueue** — List of bookings pending manager approval
- **CorporateInvoiceList** — Monthly invoices with status, download PDF
- **SpendReport** — Breakdown by department, traveler, route, month

---

## Acceptance Criteria

1. Companies can register for corporate accounts and be approved by admin
2. Corporate admins can add employees and assign roles
3. Bookers can book trips for travelers with corporate billing
4. Travel policies enforce max price, allowed routes, and seat classes
5. Approval workflow works when policy requires it
6. Negotiated rates auto-apply to corporate bookings
7. Monthly invoices generated with line items per booking
8. Credit limit checked before allowing new bookings
9. Corporate spend reports available by department, traveler, and route
10. Invoice PDFs generated and emailed to billing address

---

## Dependencies
- Skill 01, 04, 05, 13

## Blocks
- None
