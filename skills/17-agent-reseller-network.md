# Skill 17: Agent & Reseller Network

## Objective
Build an agent/reseller system for physical ticket sellers at bus stops, markets, and shops who sell tickets on behalf of multiple agencies. Agents earn commissions, operate via the web app or USSD/SMS, and are tracked independently from agency ticketers.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 05 (Payments) completed
- Skill 13 (Business Model) completed

---

## Context

In DRC, a significant portion of ticket sales happen through independent agents — people at bus stations, markets, or shops who sell tickets for multiple transport agencies. They are not employees of any single agency. They need:
- Access to trips from multiple agencies
- Their own commission tracking per sale
- Simple tools (often feature phones or basic smartphones)
- Cash collection and settlement processes

---

## Scope

### 1. Database Migrations

#### `agents`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id UNIQUE
agent_code            VARCHAR(20) UNIQUE          -- AGT-XXXXX
display_name          VARCHAR(200)
phone_number          VARCHAR(20)
location              VARCHAR(255) NULL           -- Physical location description
city_id               BIGINT UNSIGNED FK -> cities.id NULL
commission_rate       DECIMAL(5,4) DEFAULT 0.0500 -- 5% default
commission_type       ENUM('percentage', 'fixed_per_ticket') DEFAULT 'percentage'
fixed_commission      DECIMAL(12,2) NULL          -- For fixed_per_ticket type
status                ENUM('pending', 'active', 'suspended', 'inactive') DEFAULT 'pending'
verified_at           TIMESTAMP NULL
total_sales           INT DEFAULT 0
total_commission_earned DECIMAL(12,2) DEFAULT 0
kyc_level             ENUM('none', 'basic', 'full') DEFAULT 'none'
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(agent_code)
INDEX(city_id, status)
```

#### `agent_agency_agreements`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
agent_id              BIGINT UNSIGNED FK -> agents.id
organization_id       BIGINT UNSIGNED FK -> organizations.id
commission_rate       DECIMAL(5,4) NULL           -- Override agent default for this agency
status                ENUM('pending', 'active', 'revoked') DEFAULT 'pending'
approved_by           BIGINT UNSIGNED FK -> users.id NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(agent_id, organization_id)
```

#### `agent_commissions`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
agent_id              BIGINT UNSIGNED FK -> agents.id
booking_id            BIGINT UNSIGNED FK -> bookings.id
organization_id       BIGINT UNSIGNED FK -> organizations.id
ticket_amount         DECIMAL(12,2)
commission_rate       DECIMAL(5,4)
commission_amount     DECIMAL(12,2)
currency              VARCHAR(3)
status                ENUM('pending', 'approved', 'paid') DEFAULT 'pending'
paid_at               TIMESTAMP NULL
payout_reference      VARCHAR(255) NULL
created_at            TIMESTAMP
INDEX(agent_id, created_at)
INDEX(status)
```

### 2. Agent Service

```typescript
// app/services/agent_service.ts
export class AgentService {
  async register(userId: number, data: AgentRegistrationData): Promise<Agent> {
    // 1. Create agent record (status: pending)
    // 2. Generate agent_code (AGT-XXXXX)
    // 3. Submit KYC documents
    // 4. Await admin verification
  }

  async sellTicket(agentId: number, params: {
    tripId: number
    passengerName: string
    passengerPhone: string
    seatIds: number[]
    paymentMethod: 'cash' | 'mobile_money'
  }): Promise<Booking> {
    // 1. Verify agent is active and has agreement with trip's agency
    // 2. Create booking (source: 'agent', agent_id set)
    // 3. Process payment (cash = immediate, mobile_money = async)
    // 4. Calculate agent commission
    // 5. Create agent_commission record
    // 6. Send SMS confirmation to passenger
    // 7. Update agent total_sales counter
  }

  async getAvailableTrips(agentId: number, params: {
    fromCityId?: number
    toCityId?: number
    date?: string
  }): Promise<Trip[]> {
    // Return trips from all agencies the agent has agreements with
    // Filtered by agent's city if no explicit filter
  }

  async requestPayout(agentId: number): Promise<void> {
    // 1. Sum approved commissions not yet paid
    // 2. Create payout request
    // 3. Admin reviews and processes (mobile money or cash)
  }

  async getCommissionSummary(agentId: number, period: DateRange): Promise<AgentCommissionSummary> {
    // Total sales count, total ticket amount, total commissions
    // Breakdown by agency
    // Breakdown by route
  }
}
```

### 3. API Endpoints

```
# Agent registration
POST   /api/v1/agents/register                   # Register as agent
GET    /api/v1/agents/me                          # My agent profile
PUT    /api/v1/agents/me                          # Update profile

# Agent operations
GET    /api/v1/agents/trips                       # Available trips to sell
POST   /api/v1/agents/bookings                    # Create booking as agent
GET    /api/v1/agents/bookings                    # My sales history
GET    /api/v1/agents/commissions                  # My commissions
POST   /api/v1/agents/payouts/request              # Request payout
GET    /api/v1/agents/payouts                      # Payout history
GET    /api/v1/agents/dashboard                    # Sales summary, earnings

# Agency manages agents
GET    /api/v1/org/agents                          # Agents selling our tickets
POST   /api/v1/org/agents/:agentId/approve        # Approve agent agreement
POST   /api/v1/org/agents/:agentId/revoke         # Revoke agent agreement
PUT    /api/v1/org/agents/:agentId/commission     # Set custom commission rate

# Admin
GET    /api/v1/admin/agents                        # All agents
PUT    /api/v1/admin/agents/:id/verify            # Verify agent
POST   /api/v1/admin/agents/payouts/process       # Process agent payouts
```

### 4. Frontend Components

- **AgentRegistrationForm** — Sign up as agent with location, KYC docs
- **AgentDashboard** — Today's sales, total commissions, available trips, payout balance
- **AgentPOS** — Simplified booking flow: select trip → enter passenger name/phone → collect cash → print/SMS ticket
- **AgentCommissionHistory** — List of earned commissions with status
- **AgentPayoutRequest** — Request payout, view payout history
- **AgencyAgentManager** — Approve/revoke agents, set custom rates, view agent performance

---

## Acceptance Criteria

1. Agents can register, submit KYC, and be verified by admin
2. Verified agents can sell tickets for agencies they have agreements with
3. Agent commissions calculated correctly per sale
4. Agencies can approve/revoke agent agreements and set custom commission rates
5. Agents can view their sales, commissions, and request payouts
6. Agent bookings tracked with source='agent' for reporting
7. Passengers receive SMS confirmation with booking code
8. Agent POS works on basic smartphones (lightweight, offline-capable)
9. Admin can process bulk agent payouts

---

## Dependencies
- Skill 01, 04, 05, 13

## Blocks
- Skill 16 (USSD) — agents can also sell via USSD
