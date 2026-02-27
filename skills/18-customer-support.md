# Skill 18: Customer Support & Dispute Resolution

## Objective
Build an in-app customer support system with ticketing, dispute resolution workflows, FAQ/knowledge base, and escalation paths. Handle complaints about cancelled trips, lost parcels, refund requests, and agency-passenger disputes.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 05 (Payments) — for refund processing
- Skill 06 (Notifications) completed

---

## Scope

### 1. Database Migrations

#### `support_tickets`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
ticket_number         VARCHAR(20) UNIQUE          -- SUP-XXXXXX
user_id               BIGINT UNSIGNED FK -> users.id       -- Reporter
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL  -- Related org
category              ENUM('booking_issue', 'payment_issue', 'trip_cancelled', 'refund_request',
                           'lost_parcel', 'driver_complaint', 'agency_complaint', 'account_issue',
                           'technical', 'other')
priority              ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium'
status                ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agency',
                           'escalated', 'resolved', 'closed') DEFAULT 'open'
subject               VARCHAR(255)
description           TEXT
booking_id            BIGINT UNSIGNED FK -> bookings.id NULL
payment_id            BIGINT UNSIGNED FK -> payments.id NULL
parcel_id             BIGINT UNSIGNED FK -> parcels.id NULL
assigned_to           BIGINT UNSIGNED FK -> users.id NULL   -- Support agent
resolved_at           TIMESTAMP NULL
resolution_note       TEXT NULL
satisfaction_rating   TINYINT NULL                 -- 1-5, submitted after resolution
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(user_id, status)
INDEX(organization_id, status)
INDEX(assigned_to, status)
INDEX(status, priority)
INDEX(ticket_number)
```

#### `support_messages`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
ticket_id             BIGINT UNSIGNED FK -> support_tickets.id
sender_id             BIGINT UNSIGNED FK -> users.id
sender_role           ENUM('customer', 'agency', 'support', 'system')
message               TEXT
attachments           JSON NULL                    -- [{url, name, type, size}]
is_internal           BOOLEAN DEFAULT false        -- Internal notes (not visible to customer)
created_at            TIMESTAMP
INDEX(ticket_id, created_at)
```

#### `disputes`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
support_ticket_id     BIGINT UNSIGNED FK -> support_tickets.id
booking_id            BIGINT UNSIGNED FK -> bookings.id
complainant_user_id   BIGINT UNSIGNED FK -> users.id
respondent_org_id     BIGINT UNSIGNED FK -> organizations.id NULL
respondent_user_id    BIGINT UNSIGNED FK -> users.id NULL
type                  ENUM('refund', 'service_quality', 'safety', 'overcharge', 'no_show', 'cancellation')
status                ENUM('open', 'under_review', 'awaiting_response', 'mediation', 'resolved', 'closed')
resolution            ENUM('full_refund', 'partial_refund', 'credit', 'apology', 'no_action', 'penalty') NULL
resolution_amount     DECIMAL(12,2) NULL
resolution_note       TEXT NULL
deadline              TIMESTAMP NULL               -- SLA deadline for resolution
resolved_at           TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(support_ticket_id)
INDEX(status, deadline)
```

#### `faq_articles`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
category              VARCHAR(100)
title                 JSON                         -- {"fr": "...", "en": "...", "ln": "...", "sw": "..."}
content               JSON                         -- Same multi-lang structure
slug                  VARCHAR(200) UNIQUE
sort_order            INT DEFAULT 0
is_published          BOOLEAN DEFAULT true
view_count            INT DEFAULT 0
helpful_count         INT DEFAULT 0
not_helpful_count     INT DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(category, is_published)
```

### 2. Support Service

```typescript
// app/services/support_service.ts
export class SupportService {
  async createTicket(userId: number, data: CreateTicketData): Promise<SupportTicket> {
    // 1. Generate ticket number (SUP-XXXXXX)
    // 2. Auto-set priority based on category:
    //    - trip_cancelled, lost_parcel → high
    //    - refund_request → medium
    //    - technical, other → low
    // 3. Auto-link booking/payment if referenced
    // 4. Create ticket + initial message
    // 5. Notify support team
    // 6. Send confirmation to user with ticket number
  }

  async assignTicket(ticketId: number, agentUserId: number): Promise<void> {
    // Assign to support agent, update status to in_progress, notify agent
  }

  async escalate(ticketId: number, reason: string): Promise<void> {
    // Escalate to supervisor/admin
    // Update priority to high/urgent
    // Notify escalation team
  }

  async resolve(ticketId: number, agentUserId: number, resolution: ResolutionData): Promise<void> {
    // 1. Mark as resolved
    // 2. Record resolution note
    // 3. If refund: trigger refund via PaymentService
    // 4. If credit: add to user's loyalty/credit balance
    // 5. Notify user of resolution
    // 6. Schedule satisfaction rating request (send after 24h)
  }

  async autoCreateFromEvent(event: string, data: any): Promise<void> {
    // Auto-create tickets from system events:
    // - Trip cancelled by agency → ticket for all affected passengers
    // - Payment failed after 3 retries → ticket for investigation
    // - Parcel not scanned for 48h → ticket for tracking
  }
}
```

### 3. Dispute Resolution Workflow

```
1. Customer files complaint (via support ticket)
2. System creates dispute, notifies agency
3. Agency has 48h to respond
4. If agency responds with resolution → customer accepts or rejects
5. If customer rejects or agency doesn't respond → escalate to platform mediation
6. Platform mediator reviews evidence (booking details, GPS data, payment history)
7. Mediator decides: refund, partial refund, credit, or no action
8. Both parties notified of decision
9. If refund: auto-processed via payment system
```

### 4. API Endpoints

```
# Customer support
POST   /api/v1/support/tickets                    # Create ticket
GET    /api/v1/support/tickets                    # My tickets
GET    /api/v1/support/tickets/:id                # Ticket details + messages
POST   /api/v1/support/tickets/:id/messages       # Add message to ticket
POST   /api/v1/support/tickets/:id/rate           # Rate resolution (1-5)

# FAQ
GET    /api/v1/support/faq                        # FAQ articles (by category)
GET    /api/v1/support/faq/:slug                  # Single article
POST   /api/v1/support/faq/:id/helpful            # Mark as helpful/not helpful

# Agency support view
GET    /api/v1/org/support/tickets                # Tickets involving our org
POST   /api/v1/org/support/tickets/:id/respond    # Agency responds to dispute

# Admin support management
GET    /api/v1/admin/support/tickets               # All tickets (filterable)
PUT    /api/v1/admin/support/tickets/:id/assign   # Assign to agent
PUT    /api/v1/admin/support/tickets/:id/escalate # Escalate
PUT    /api/v1/admin/support/tickets/:id/resolve  # Resolve with action
GET    /api/v1/admin/support/stats                 # Support metrics
POST   /api/v1/admin/support/faq                   # Create/update FAQ article
```

### 5. Frontend Components

- **SupportButton** — Floating help button on all pages (bottom-right)
- **CreateTicketForm** — Category selector, subject, description, file upload, auto-link current booking
- **TicketList** — My open/resolved tickets with status badges
- **TicketChat** — Chat-like message thread with attachments and system events
- **SatisfactionRating** — Star rating + optional comment after resolution
- **FAQPage** — Searchable FAQ with categories, expandable answers
- **SupportDashboard** (Admin) — Open tickets, avg resolution time, satisfaction score, volume charts
- **DisputePanel** (Admin) — Evidence review, agency response, resolution actions

---

## Acceptance Criteria

1. Users can create support tickets from any page via floating help button
2. Tickets auto-link to relevant booking/payment when created from those pages
3. Chat-like messaging works between customer, agency, and support
4. Internal notes visible only to support team
5. Disputes follow the escalation workflow with 48h agency response deadline
6. Refund resolutions auto-trigger payment refund
7. Satisfaction rating requested 24h after resolution
8. FAQ articles searchable and available in all 4 languages
9. Auto-ticket creation on trip cancellation for affected passengers
10. Admin dashboard shows support metrics (volume, avg resolution time, satisfaction)
11. SLA tracking: urgent tickets flagged if not responded to within 4h

---

## Dependencies
- Skill 01, 05, 06

## Blocks
- None
