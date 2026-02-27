# Skill 09: Dashboards & Reporting

## Objective
Build role-specific dashboards with rich data visualization, reporting, and export capabilities. Each role sees a tailored interface optimized for their workflow. Includes revenue, expense, tax reporting, and pre-computed report snapshots for performance.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 05 (Payments) completed

---

## Scope

### 1. Database Migrations

#### `expenses`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id
category              ENUM('fuel', 'maintenance', 'salary', 'tax', 'insurance', 'toll', 'other')
description           TEXT
amount                DECIMAL(12,2)
currency              VARCHAR(3) DEFAULT 'CDF'
date                  DATE
vehicle_id            BIGINT UNSIGNED FK -> vehicles.id NULL
trip_id               BIGINT UNSIGNED FK -> trips.id NULL
receipt_url           VARCHAR(500) NULL
created_by_id         BIGINT UNSIGNED FK -> users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id, date)
INDEX(category)
```

#### `report_snapshots`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL  -- NULL = system-wide
type                  VARCHAR(50)             -- 'daily_revenue', 'monthly_summary', 'tax_report'
period_start          DATE
period_end            DATE
data                  JSON                    -- Pre-computed report data
generated_by_id       BIGINT UNSIGNED FK -> users.id NULL
generated_at          TIMESTAMP
created_at            TIMESTAMP
INDEX(organization_id, type, period_start)
INDEX(type, period_start)
```

---

### 2. API Endpoints

#### Reports
```
# Revenue reports
GET    /api/v1/reports/revenue                   # Revenue by period (day/week/month)
GET    /api/v1/reports/revenue/by-route           # Revenue breakdown by route
GET    /api/v1/reports/revenue/by-vehicle         # Revenue breakdown by vehicle
GET    /api/v1/reports/revenue/by-driver          # Revenue breakdown by driver

# Trip reports
GET    /api/v1/reports/trips                     # Trip statistics (count, occupancy rate)
GET    /api/v1/reports/trips/occupancy            # Seat occupancy analysis

# Booking reports
GET    /api/v1/reports/bookings                  # Booking statistics
GET    /api/v1/reports/bookings/cancellations     # Cancellation analysis

# Financial reports
GET    /api/v1/reports/financial/summary          # Revenue - Expenses = Profit
GET    /api/v1/reports/financial/tax              # Tax report (configurable tax rate)
GET    /api/v1/reports/financial/payouts          # Driver/agency payout history

# Expenses
GET    /api/v1/expenses                          # List expenses
POST   /api/v1/expenses                          # Create expense
PUT    /api/v1/expenses/:id                      # Update expense
DELETE /api/v1/expenses/:id                      # Delete expense
GET    /api/v1/expenses/summary                  # Summary by category

# Exports
GET    /api/v1/reports/export/csv/:type           # Export report as CSV
GET    /api/v1/reports/export/pdf/:type           # Export report as PDF

# Report snapshots
GET    /api/v1/reports/snapshots                 # List snapshots
POST   /api/v1/reports/snapshots/generate         # Trigger snapshot generation
```

#### Dashboard Stats
```
# Super Admin stats
GET    /api/v1/stats/admin/overview              # Total orgs, users, trips, revenue
GET    /api/v1/stats/admin/organizations          # Org-level metrics

# Agency stats
GET    /api/v1/stats/agency/overview             # Org revenue, trips, bookings today
GET    /api/v1/stats/agency/today                 # Today's snapshot

# Driver stats
GET    /api/v1/stats/driver/overview             # Personal earnings, trips
GET    /api/v1/stats/driver/today                 # Today's trips

# Ticketer stats
GET    /api/v1/stats/ticketer/today              # Today's sales
```

---

### 3. Report Service

```typescript
// app/services/report_service.ts
export class ReportService {
  /**
   * Revenue report with flexible grouping
   */
  async revenueReport(params: {
    organizationId?: number
    periodStart: DateTime
    periodEnd: DateTime
    groupBy: 'day' | 'week' | 'month'
    routeId?: number
    vehicleId?: number
    driverId?: number
  }): Promise<RevenueReportData> {
    // Query payments table joined with bookings, trips, routes
    // Group by period
    // Return: { periods: [{ date, revenue, bookingCount, currency }], total }
  }

  /**
   * Trip occupancy analysis
   */
  async occupancyReport(params: {
    organizationId: number
    periodStart: DateTime
    periodEnd: DateTime
  }): Promise<OccupancyReportData> {
    // trips.total_seats vs booked seats
    // Average occupancy rate
    // Breakdown by route, time of day, day of week
  }

  /**
   * Financial summary (P&L)
   */
  async financialSummary(params: {
    organizationId: number
    periodStart: DateTime
    periodEnd: DateTime
  }): Promise<FinancialSummaryData> {
    // Revenue (from payments)
    // - Expenses (from expenses table)
    // = Gross Profit
    // - Tax (configurable rate)
    // = Net Profit
    // Breakdown by category
  }

  /**
   * Generate and store a report snapshot
   */
  async generateSnapshot(type: string, orgId: number, periodStart: DateTime, periodEnd: DateTime): Promise<ReportSnapshot> {
    // Compute the full report
    // Store as JSON in report_snapshots table
    // Return snapshot record
  }

  /**
   * Export report as CSV
   */
  async exportCsv(type: string, params: ReportParams): Promise<Buffer>

  /**
   * Export report as PDF
   */
  async exportPdf(type: string, params: ReportParams): Promise<Buffer>
}
```

---

### 4. Dashboard Widgets & Pages

#### Super Admin Dashboard (`/admin`)

**Overview Page**
- **SystemStatsCards** — Total orgs, total users, total trips (today/month/all), total revenue
- **RevenueChart** — Line chart: system-wide revenue over time
- **TopOrganizations** — Table: top 10 orgs by revenue
- **RecentActivity** — Feed of recent system events
- **ActiveTrips** — Count of currently in-progress trips

**Organization Management**
- **OrgList** — Full CRUD table with search, filters (type, status, city)
- **OrgDetail** — View org with members, vehicles, revenue
- **OrgEdit** — Edit org settings

**User Management**
- **UserList** — Full CRUD table with search, role filter
- **UserDetail** — View user with memberships, bookings, payments

**System Settings**
- **SeatClassManager** — Manage global seat classes
- **CityManager** — CRUD for cities
- **RouteManager** — CRUD for routes with stop management
- **SystemConfig** — App-wide settings (tax rates, currencies, etc.)

#### Agency/Manager Dashboard (`/agency`)

**Overview Page**
- **TodaySnapshot** — Revenue today, bookings today, active trips, departures remaining
- **RevenueChart** — Line chart: revenue by day/week/month
- **OccupancyGauge** — Average seat occupancy rate
- **TopRoutes** — Bar chart: most popular routes by bookings
- **RecentBookings** — Latest 10 bookings table
- **DriverPerformance** — Table: trips, earnings, ratings per driver

**Fleet Page**
- Vehicles table with status indicators
- Quick actions: view, edit, deactivate

**Trip Schedule Page**
- Calendar view of scheduled trips
- Create trip form
- Bulk trip creation for recurring schedules

**Members Page**
- Team members table with role badges
- Invite new member form
- Role management

**Settings Page**
- Organization profile (name, logo, address)
- KYC level requirement
- Visibility (public/private)
- Notification preferences (org-level)

#### Finance Dashboard (`/finance`)

**Overview Page**
- **RevenueSummary** — Total revenue, this month vs last month, growth %
- **RevenueVsExpenses** — Dual bar chart comparing revenue and expenses
- **ProfitTrend** — Line chart: net profit over time
- **PaymentMethodBreakdown** — Pie chart: revenue by payment method

**Revenue Page**
- **RevenueTable** — Detailed revenue table with filters (date range, route, vehicle, driver)
- **RevenueByRoute** — Breakdown chart
- **RevenueByVehicle** — Breakdown chart
- Export to CSV/PDF buttons

**Expenses Page**
- **ExpenseTable** — CRUD table for expenses with category filter
- **ExpenseForm** — Add expense with receipt upload
- **ExpenseSummary** — By category (pie chart + table)

**Tax Report Page**
- **TaxSummary** — Taxable revenue, tax rate, tax amount
- **TaxByPeriod** — Monthly/quarterly tax table
- Export for tax filing

**Payouts Page**
- **PayoutList** — History of driver/agency payouts
- **PayoutCreate** — Create new payout

#### Driver Dashboard (`/driver`)

**Overview Page**
- **TodayTrips** — List of today's assigned trips with status
- **EarningsSummary** — Earnings this week/month
- **NextTrip** — Highlighted card for next upcoming trip
- **QuickActions** — Start trip, complete trip, toggle GPS

**Trips Page**
- **UpcomingTrips** — Future assigned trips
- **TripHistory** — Past trips with earnings per trip
- **TripDetail** — Passengers list, route, earnings

**Earnings Page**
- **EarningsChart** — Daily/weekly/monthly earnings line chart
- **EarningsTable** — Per-trip earnings breakdown
- **PayoutHistory** — List of received payouts

**Vehicle Page**
- Current vehicle info
- Vehicle status (verification, documents)

#### Ticketer Dashboard (`/ticketer`)

**POS Page** (primary — optimized for speed)
- Already covered in Skill 04
- Enhancements here: daily sales summary widget, recent sales sidebar

**Sales Summary Page**
- **TodaySales** — Total tickets sold, revenue, by trip
- **SalesHistory** — Historical daily/weekly sales
- **SalesChart** — Bar chart of daily sales

**Parcel Page**
- Parcels registered today
- Parcel status list

#### Passenger Dashboard (`/passenger`)

**Overview Page**
- **UpcomingBookings** — Cards for upcoming trips
- **ActiveTrip** — Live tracking if trip is in progress
- **BookingHistory** — Past bookings list
- **QuickBook** — Shortcut to trip search

**Profile Page**
- Personal info edit
- KYC status and document upload
- Notification preferences

---

### 5. Shared Dashboard Components

- **DateRangePicker** — Preset ranges (today, this week, this month, custom)
- **DataTable** — Sortable, filterable, paginated table (server-side)
- **StatsCard** — Number + label + trend indicator
- **LineChart** — Recharts line chart wrapper
- **BarChart** — Recharts bar chart wrapper
- **PieChart** — Recharts pie chart wrapper
- **ExportButton** — Download CSV/PDF
- **CurrencyDisplay** — Formatted currency with locale support
- **StatusBadge** — Colored badge for entity statuses
- **EmptyState** — Illustration + message for empty data

---

### 6. Report Generation Jobs

```typescript
// app/jobs/generate_daily_report_job.ts
// Cron: runs at 00:30 every day
// Generates daily revenue snapshot for each org

// app/jobs/generate_monthly_report_job.ts
// Cron: runs on 1st of each month at 01:00
// Generates monthly summary for each org

// app/jobs/cleanup_old_data_job.ts
// Cron: runs weekly
// Archives GPS data older than 6 months
// Compresses audit logs older than 1 year
```

---

## Acceptance Criteria

1. Super admin sees system-wide stats and can manage all organizations
2. Agency manager sees org-specific revenue, trips, and fleet overview
3. Finance user can view revenue reports filtered by date, route, vehicle, driver
4. Finance user can create/manage expenses with receipt uploads
5. Tax report calculates correctly based on configurable tax rate
6. Driver sees today's trips, earnings summary, and payout history
7. Ticketer sees daily sales summary and recent transactions
8. Charts render correctly with real data (revenue, occupancy, expenses)
9. CSV/PDF exports contain correct data with proper formatting
10. Report snapshots generate via cron and are accessible for historical queries
11. Date range picker works with presets and custom ranges
12. Dashboard loads fast (< 2s) with paginated data and cached aggregations
13. Responsive layout works on tablet (ticketer) and desktop (admin/finance)

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking)
- Skill 05 (Payments)

## Blocks
- None (this is a presentation/reporting layer)
