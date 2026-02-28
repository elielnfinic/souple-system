# Souple System — Project Progress

> **Legend**: `[ ]` Pending · `[x]` Done · `[~]` In Progress · `[!]` Blocked
>
> **Reviewers**: Kael (Dev) · Mila (Design) · Zane (QA) · Aïcha (PM)

---

## Phase 1: Core Foundation

### Skill 01: Foundation [17/20]

**Database & Schema**
- [x] DB: Create `users` table with OTP fields, phone, email, avatar (Kael)
- [x] DB: Create `organizations` table with settings JSON, subscription tier (Kael)
- [x] DB: Create `org_members` table with role enum and join date (Kael)
- [x] DB: Create `cities` table with coordinates and timezone (Kael)
- [x] DB: Create `routes` table linking origin/destination cities (Kael)
- [x] DB: Create `route_stops` table with ordering, distance_km, duration_min (Kael)
- [x] DB: Create `audit_logs` table for sensitive operation tracking (Kael → Zane)

**Authentication & Authorization**
- [x] Auth: OTP generation, sending (SMS/email), and verification (Kael → Zane)
- [x] Auth: Access token + refresh token flow (Kael → Zane)
- [x] Auth: Registration endpoint with org creation (Kael → Zane)
- [x] Auth: Login endpoint with OTP (Kael → Zane)
- [x] RBAC: Role-based middleware (super_admin, org_admin, manager, driver, ticketer, passenger) (Kael → Zane)
- [x] RBAC: Org-scoped authorization (users can only access their org's data) (Kael → Zane)

**API Infrastructure**
- [x] API: Standardized response envelope (success, error, pagination) (Kael)
- [x] API: Rate limiting middleware on public endpoints (Kael → Zane)
- [x] API: Shield security headers configuration (Kael → Zane)
- [x] API: CORS configuration (Kael → Zane)

**Core CRUD**
- [x] CRUD: Users (profile, update, list by org) (Kael)
- [x] CRUD: Organizations (create, update, settings) (Kael)
- [x] CRUD: Cities, routes, route_stops (Kael)

**Sign-off**
- [ ] Acceptance: All Skill 01 criteria validated (Aïcha)

---

### Skill 02: UI/UX Design System [15/18]

**Design Tokens**
- [x] Tokens: Color system — brand blue, neutral palette, semantic colors (Mila)
- [x] Tokens: Typography scale — Inter (UI) + JetBrains Mono (code/data) (Mila)
- [x] Tokens: Spacing scale (4px base) and layout grid (Mila)
- [x] Tokens: Shadow, border-radius, and elevation system (Mila)

**Theme & Layout**
- [x] Theme: Light/dark mode provider with system preference detection (Mila → Kael)
- [x] Theme: CSS custom properties integration with Tailwind v4 (Mila → Kael)
- [x] Layout: Responsive breakpoints (320px, 768px, 1024px, 1440px) (Mila → Kael)
- [x] Layout: Role-based density variants (spacious for passenger, dense for operator) (Mila → Kael)

**Component Library**
- [x] Components: Buttons (primary, secondary, ghost, destructive + sizes) (Mila → Kael)
- [x] Components: Form inputs (text, select, checkbox, radio, date picker) (Mila → Kael)
- [x] Components: Cards, modals, dialogs, and drawers (Mila → Kael)
- [x] Components: Data tables with sorting, filtering, pagination (Mila → Kael)
- [x] Components: Toast notifications and alert banners (Mila → Kael)
- [x] Components: Loading skeletons and empty states (Mila → Kael)

**Internationalization**
- [x] i18n: next-intl setup with FR (default), EN, LN, SW (Kael)
- [x] i18n: Timezone display conversion (UTC → local via Luxon) (Kael)
- [x] i18n: Dual-currency formatting ("45 000 FC (~$16)") (Kael)

**Sign-off**
- [ ] Acceptance: All Skill 02 criteria validated (Aïcha)

---

## Phase 2: Core Platform

### Skill 03: Fleet & Vehicle Management [14/14]

**Database**
- [x] DB: Create `vehicles` table with capacity, plate, make, model, year, status (Kael)
- [x] DB: Create `seat_layouts` table with JSON layout definition (Kael)
- [x] DB: Create `seat_classes` table (VIP, Economy, Business) with pricing multiplier (Kael)
- [x] DB: Create `vehicle_photos` table with S3 references (Kael)

**Backend**
- [x] API: Vehicle CRUD endpoints with org-scoping (Kael → Zane)
- [x] API: Seat layout builder — save/load custom seat configurations (Kael → Zane)
- [x] API: Vehicle verification workflow (pending → verified → rejected) (Kael → Zane)
- [x] Service: S3 photo upload with size/type validation (Kael → Zane)

**Frontend**
- [x] UI: Vehicle list with filters (status, type) and search (Mila → Kael)
- [x] UI: Vehicle detail/edit form (Mila → Kael)
- [x] UI: Interactive seat layout editor (drag-and-drop grid) (Mila → Kael)
- [x] UI: 2D seat visualization with class color coding (Mila → Kael)
- [x] UI: Photo upload gallery with preview (Mila → Kael)

**Sign-off**
- [x] Acceptance: All Skill 03 criteria validated (Aïcha)

---

### Skill 04: Trips & Booking [0/22]

> **Critical Skill** — Core of the platform. Segment-based availability is the key differentiator.

**Database**
- [ ] DB: Create `trips` table with vehicle, route, departure_at, status (Kael)
- [ ] DB: Create `trip_stops` table (materialized from route_stops per trip) (Kael)
- [ ] DB: Create `trip_seats` table (materialized from seat layout per trip) (Kael)
- [ ] DB: Create `bookings` table with boarding/alighting stops, status, pricing (Kael)
- [ ] DB: Create `booking_seats` table linking bookings to specific seats (Kael)
- [ ] DB: Create `fleet_bookings` table (events, rentals, moving, day rental) (Kael)

**Backend — Segment Availability**
- [ ] Service: Segment-based seat availability engine (interval overlap checking) (Kael → Zane)
- [ ] Service: Seat locking during booking flow (Redis-based, with TTL expiry) (Kael → Zane)
- [ ] Service: Concurrent booking protection (no double-booking on same seat+segment) (Kael → Zane)

**Backend — Booking Flow**
- [ ] API: Trip CRUD with stop/seat materialization (Kael → Zane)
- [ ] API: Search trips (origin, destination, date, passengers) (Kael → Zane)
- [ ] API: Booking creation with segment pricing calculation (Kael → Zane)
- [ ] API: Booking cancellation with refund rules (Kael → Zane)
- [ ] API: Fleet booking flow (Kael → Zane)
- [ ] Service: QR code generation for tickets (Kael)
- [ ] Service: Driver manifest — per-stop boarding/alighting list (Kael)

**Frontend**
- [ ] UI: Trip search with origin/destination/date pickers (Mila → Kael)
- [ ] UI: Trip results list with pricing and availability (Mila → Kael)
- [ ] UI: Seat selection with segment-aware availability map (Mila → Kael)
- [ ] UI: Booking confirmation with QR code display (Mila → Kael)
- [ ] UI: Ticketer POS interface (optimized for speed and offline) (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 04 criteria validated (Aïcha)

---

### Skill 05: Payment Integration [0/16]

**Database**
- [ ] DB: Create `payments` table with provider, method, status, amount, currency (Kael)
- [ ] DB: Create `payment_attempts` table for retry tracking (Kael)
- [ ] DB: Create `refunds` table linked to payments and bookings (Kael)

**Backend**
- [ ] Service: Provider-agnostic payment interface (strategy pattern) (Kael)
- [ ] Service: Mobile money integration — MTN MoMo (Kael → Zane)
- [ ] Service: Mobile money integration — Orange Money (Kael → Zane)
- [ ] Service: Mobile money integration — Airtel Money (Kael → Zane)
- [ ] Service: Card payment integration — Stripe (Kael → Zane)
- [ ] Service: Stablecoin support — USDT/USDC (Kael → Zane)
- [ ] Service: Cash payment recording (Kael)
- [ ] API: Webhook handlers for all payment providers (idempotent) (Kael → Zane)
- [ ] Service: Receipt generation (PDF) (Kael)
- [ ] API: Refund processing with provider-specific logic (Kael → Zane)

**Frontend**
- [ ] UI: Payment method selection and checkout flow (Mila → Kael)
- [ ] UI: Payment history and receipt download (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 05 criteria validated (Aïcha)

---

## Phase 3: Communication & Notifications

### Skill 06: Notifications & Communication [0/12]

**Database**
- [ ] DB: Create `notifications` table with channel, status, template (Kael)
- [ ] DB: Create `notification_preferences` table per user (Kael)

**Backend**
- [ ] Service: Multi-channel dispatcher (Email, SMS, Telegram, Web Push) (Kael)
- [ ] Service: BullMQ job queue for async notification processing (Kael)
- [ ] Service: Email provider integration (Kael)
- [ ] Service: SMS provider integration (Kael)
- [ ] Service: Telegram bot integration (@BotFather setup) (Kael → Zane)
- [ ] Service: Web Push notification with service worker (Kael)
- [ ] Service: Template engine for notification messages (Kael)

**Frontend**
- [ ] UI: Notification preferences settings (Mila → Kael)
- [ ] UI: In-app notification center with read/unread (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 06 criteria validated (Aïcha)

---

### Skill 16: USSD & SMS Booking [0/10]

**Backend**
- [ ] Service: USSD session manager (Redis-based state machine) (Kael → Zane)
- [ ] Service: USSD menu flow builder (language selection → city → route → trip → booking) (Kael)
- [ ] Service: SMS command parser (BOOK, STATUS, CANCEL, HELP) (Kael → Zane)
- [ ] Service: City name fuzzy matching for SMS input (Kael)
- [ ] API: USSD callback endpoint for telecom provider (Kael → Zane)
- [ ] API: SMS webhook endpoint (Kael → Zane)
- [ ] i18n: USSD/SMS messages in FR, EN, LN, SW (Kael)

**Testing**
- [ ] Test: USSD flow end-to-end simulation (Zane)
- [ ] Test: SMS command parsing with edge cases (Zane)

**Sign-off**
- [ ] Acceptance: All Skill 16 criteria validated (Aïcha)

---

### Skill 19: WhatsApp Bot Integration [0/10]

**Backend**
- [ ] Service: WhatsApp Business API client (Kael → Zane)
- [ ] Service: Conversational booking flow state machine (Kael)
- [ ] Service: Natural language intent parsing for booking (Kael)
- [ ] Service: Interactive message builder (buttons, lists) (Kael)
- [ ] API: WhatsApp webhook handler with signature verification (Kael → Zane)
- [ ] Service: Message template management (Meta-approved) (Kael)
- [ ] Service: Support ticket escalation from WhatsApp (Kael)

**Testing**
- [ ] Test: Conversational flow end-to-end (Zane)
- [ ] Test: Webhook security and signature validation (Zane)

**Sign-off**
- [ ] Acceptance: All Skill 19 criteria validated (Aïcha)

---

### Skill 21: In-App Messaging [0/10]

**Database**
- [ ] DB: Create `conversations` table with participants (Kael)
- [ ] DB: Create `messages` table with content, sender, read_at (Kael)

**Backend**
- [ ] API: Conversation CRUD (create, list, get messages) (Kael → Zane)
- [ ] API: Send message with content moderation (filter phone/email) (Kael → Zane)
- [ ] Service: System messages for trip events (delay, cancel, gate change) (Kael)
- [ ] Service: Canned responses for agencies (Kael)
- [ ] Service: Unread message count per user (Kael)

**Frontend**
- [ ] UI: Chat interface with message bubbles and timestamps (Mila → Kael)
- [ ] UI: Conversation list with unread badges (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 21 criteria validated (Aïcha)

---

## Phase 4: Hardware & Logistics

### Skill 07: Hardware Integration [0/12]

**Backend**
- [ ] Service: GPS position ingestion and storage (Kael)
- [ ] API: SSE endpoint for real-time vehicle tracking (Kael → Zane)
- [ ] Service: GPS data aggregation and trip matching (Kael)

**Frontend — Printing**
- [ ] Service: ESC/POS command builder for thermal printers (Kael)
- [ ] Service: Bluetooth printer discovery and connection (Web Bluetooth API) (Kael)
- [ ] Service: USB printer support (WebUSB API) (Kael)
- [ ] UI: Print ticket action with preview (Mila → Kael)

**Frontend — Scanning**
- [ ] Service: QR/barcode scanner integration (html5-qrcode) (Kael)
- [ ] UI: Scanner overlay for ticket validation (Mila → Kael)

**Parcel Management**
- [ ] DB: Create `parcels` table with sender, receiver, status, tracking_code (Kael)
- [ ] API: Parcel CRUD with tracking workflow (Kael → Zane)
- [ ] UI: Parcel tracking interface with scan events (Mila → Kael)

**Sign-off (implicit in testing)**

---

### Skill 22: Vehicle Maintenance & Compliance [0/10]

**Database**
- [ ] DB: Create `vehicle_documents` table (type, expiry_date, file_url, status) (Kael)
- [ ] DB: Create `maintenance_records` table (type, date, cost, notes) (Kael)

**Backend**
- [ ] API: Document CRUD with expiry tracking (Kael → Zane)
- [ ] API: Maintenance record CRUD with odometer integration (Kael)
- [ ] Service: Alert scheduler — 30-day, 7-day, expired warnings via BullMQ (Kael)
- [ ] Service: Compliance gate — block trip creation if documents expired (Kael → Zane)
- [ ] Service: Odometer auto-update from GPS data (Kael)

**Frontend**
- [ ] UI: Document management dashboard with status badges (Mila → Kael)
- [ ] UI: Maintenance log with upcoming schedule (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 22 criteria validated (Aïcha)

---

## Phase 5: Operations & Quality

### Skill 08: Offline Support [0/10]

**Frontend**
- [ ] Service: Service Worker setup with Workbox caching strategies (Kael)
- [ ] Service: IndexedDB storage layer for offline data (Kael)
- [ ] Service: Sync manager with queue and conflict resolution (Kael → Zane)
- [ ] Service: Offline booking creation and queuing (Kael → Zane)
- [ ] Service: Data freshness indicators (last synced timestamp) (Kael)
- [ ] Service: Prefetch critical data for offline operation (Kael)
- [ ] UI: Online/offline status indicator (Mila → Kael)
- [ ] UI: Sync status with pending/failed items (Mila → Kael)

**Testing**
- [ ] Test: Offline booking → come online → sync without data loss (Zane)

**Sign-off**
- [ ] Acceptance: All Skill 08 criteria validated (Aïcha)

---

### Skill 09: Dashboards & Reporting [0/14]

**Backend**
- [ ] Service: Report snapshot engine (pre-computed daily/weekly/monthly) via BullMQ (Kael)
- [ ] API: Revenue reports with grouping (day, week, month, route, vehicle) (Kael)
- [ ] API: Trip occupancy and load factor analysis (Kael)
- [ ] API: Expense tracking and P&L summaries (Kael)
- [ ] API: Tax reporting (Kael)
- [ ] Service: CSV export generator (Kael)
- [ ] Service: PDF report generator (Kael)

**Frontend**
- [ ] UI: Super Admin dashboard (platform-wide metrics) (Mila → Kael)
- [ ] UI: Agency dashboard (org-specific metrics) (Mila → Kael)
- [ ] UI: Finance dashboard (revenue, expenses, P&L) (Mila → Kael)
- [ ] UI: Driver dashboard (trips, earnings, schedule) (Mila → Kael)
- [ ] UI: Ticketer dashboard (sales, shift summary) (Mila → Kael)
- [ ] UI: Passenger dashboard (upcoming trips, history) (Mila → Kael)
- [ ] UI: Charts integration with Recharts (Mila → Kael)

**Sign-off (implicit in per-dashboard acceptance)**

---

### Skill 10: KYC & Security [0/12]

**Database**
- [ ] DB: Create `kyc_documents` table (type, status, file_url, verified_by) (Kael)

**Backend**
- [ ] API: Document upload with type/size validation (Kael → Zane)
- [ ] API: KYC verification workflow (pending → approved → rejected) (Kael → Zane)
- [ ] Service: KYC level enforcement in booking flow (none, basic, full) (Kael → Zane)
- [ ] Service: Document expiry handling with re-verification alerts (Kael)
- [ ] API: Audit log viewer with full-text search (Kael → Zane)
- [ ] Service: Security events logging (login attempts, role changes, data access) (Kael → Zane)
- [ ] Service: Account lockout after N failed attempts (Kael → Zane)

**Frontend**
- [ ] UI: KYC document upload interface (Mila → Kael)
- [ ] UI: KYC verification queue for admins (Mila → Kael)
- [ ] UI: Audit log viewer with filters and search (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 10 criteria validated (Aïcha)

---

### Skill 11: Testing, Deployment & Polish [0/16]

**Testing**
- [ ] Test: Unit tests — 80%+ coverage on services (Japa) (Zane → Kael)
- [ ] Test: Integration tests — full booking flow end-to-end (Zane → Kael)
- [ ] Test: Integration tests — payment webhook processing (Zane → Kael)
- [ ] Test: Integration tests — RBAC across all roles (Zane → Kael)
- [ ] Test: E2E tests — critical user journeys (Playwright) (Zane)
- [ ] Test: Load testing — 1000 concurrent users, zero double-bookings (k6) (Zane)

**Infrastructure**
- [ ] Infra: Docker Compose production setup (MySQL, Redis, API, Worker, Nginx) (Kael)
- [ ] Infra: Certbot SSL certificate automation (Kael)
- [ ] Infra: GitHub Actions CI — test on PR (Kael)
- [ ] Infra: GitHub Actions CD — deploy on merge to main (Kael)
- [ ] Infra: Database backup to S3 (daily cron) (Kael)
- [ ] Infra: Prometheus metrics endpoint (Kael)
- [ ] Infra: Grafana dashboard setup (Kael)
- [ ] Infra: Sentry error tracking integration (Kael)

**Performance**
- [ ] Perf: Database index audit on all query patterns (Kael)
- [ ] Perf: Redis caching layer for hot data (Kael)

**Sign-off**
- [ ] Acceptance: All Skill 11 criteria validated (Aïcha)

---

## Phase 6: Monetization & Commerce

### Skill 12: Marketplace & Advanced Features [0/14]

**Database**
- [ ] DB: Create `reviews` table with rating, comment, booking_id (Kael)
- [ ] DB: Create `api_keys` table with scopes and rate limits (Kael)
- [ ] DB: Create `webhooks` table (outgoing) with URL, events, secret (Kael)

**Backend**
- [ ] API: Public marketplace search (cross-org trip discovery) (Kael → Zane)
- [ ] API: Rating & review CRUD (post-booking only) (Kael → Zane)
- [ ] API: Independent driver self-registration flow (Kael → Zane)
- [ ] Service: Advanced analytics — demand analysis, peak detection, retention (Kael)
- [ ] API: External API with API key authentication (Kael → Zane)
- [ ] Service: Outgoing webhook dispatcher with retry logic (Kael → Zane)
- [ ] Service: OpenAPI documentation generation (Kael)

**Frontend**
- [ ] UI: Public marketplace with search and filters (Mila → Kael)
- [ ] UI: Rating & review display and submission (Mila → Kael)
- [ ] UI: API key management dashboard (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 12 criteria validated (Aïcha)

---

### Skill 13: Subscription Billing [0/12]

**Database**
- [ ] DB: Create `subscriptions` table (tier, status, billing_cycle, next_billing) (Kael)
- [ ] DB: Create `invoices` table (amount, status, line_items JSON) (Kael)
- [ ] DB: Create `subscription_add_ons` table (Kael)

**Backend**
- [ ] Service: Tier definitions (Basic free, Pro, Enterprise) with feature gates (Kael)
- [ ] Service: Feature gating middleware — check org subscription tier (Kael → Zane)
- [ ] API: Subscription CRUD with upgrade/downgrade proration (Kael → Zane)
- [ ] Service: Commission calculation on marketplace bookings (Kael → Zane)
- [ ] Service: Monthly billing job (BullMQ) with invoice generation (Kael)
- [ ] Service: Past-due handling and grace period logic (Kael)

**Frontend**
- [ ] UI: Subscription plans comparison page (Mila → Kael)
- [ ] UI: Billing dashboard with invoices and payment history (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 13 criteria validated (Aïcha)

---

### Skill 14: Multi-Currency & Exchange Rates [0/8]

**Database**
- [ ] DB: Create `exchange_rates` table with source/target currency and rate (Kael)

**Backend**
- [ ] Service: Exchange rate management (manual + API-sourced) (Kael)
- [ ] Service: Rate locking at booking time (Kael → Zane)
- [ ] Service: Currency conversion utility (Kael)
- [ ] API: Exchange rate CRUD for admins (Kael)

**Frontend**
- [ ] UI: Dual-currency display component ("45 000 FC (~$16)") (Mila → Kael)
- [ ] UI: Exchange rate management for admins (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 14 criteria validated (Aïcha)

---

### Skill 15: Promotions, Coupons & Loyalty [0/14]

**Database**
- [ ] DB: Create `promotions` table (type, conditions, discount, validity) (Kael)
- [ ] DB: Create `coupons` table (code, usage_limit, conditions) (Kael)
- [ ] DB: Create `loyalty_points` table with transaction history (Kael)
- [ ] DB: Create `loyalty_tiers` table (Bronze, Silver, Gold, Platinum) (Kael)
- [ ] DB: Create `referrals` table with referrer/referee and reward status (Kael)

**Backend**
- [ ] API: Promotion CRUD with validation rules (Kael → Zane)
- [ ] Service: Coupon code validation engine (conditions, limits, expiry) (Kael → Zane)
- [ ] Service: Loyalty points calculation and tier progression (Kael → Zane)
- [ ] Service: Referral program — code generation, tracking, reward distribution (Kael → Zane)
- [ ] Service: Auto-applicable promotion matcher (Kael)
- [ ] API: Loyalty dashboard endpoints (points, tier, history) (Kael)

**Frontend**
- [ ] UI: Promotion management for agencies (Mila → Kael)
- [ ] UI: Loyalty dashboard for passengers (points, tier, rewards) (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 15 criteria validated (Aïcha)

---

## Phase 7: Agent & Corporate

### Skill 17: Agent & Reseller Network [0/10]

**Database**
- [ ] DB: Create `agents` table with KYC status and payout info (Kael)
- [ ] DB: Create `agent_agreements` table (agent ↔ agency, commission rate) (Kael)
- [ ] DB: Create `agent_commissions` table with payout tracking (Kael)

**Backend**
- [ ] API: Agent registration and KYC verification (Kael → Zane)
- [ ] API: Agent-agency agreement management (Kael → Zane)
- [ ] Service: Commission tracking and calculation per booking (Kael → Zane)
- [ ] API: Payout request and processing (Kael → Zane)

**Frontend**
- [ ] UI: Agent POS interface (multi-agency ticket sales) (Mila → Kael)
- [ ] UI: Agent dashboard (earnings, commissions, payouts) (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 17 criteria validated (Aïcha)

---

### Skill 23: Corporate & B2B Accounts [0/12]

**Database**
- [ ] DB: Create `corporate_accounts` table with billing and credit settings (Kael)
- [ ] DB: Create `corporate_members` table with roles (admin, booker, traveler) (Kael)
- [ ] DB: Create `travel_policies` table with budget limits and rules (Kael)
- [ ] DB: Create `negotiated_rates` table (corporate ↔ agency) (Kael)

**Backend**
- [ ] API: Corporate account registration and approval workflow (Kael → Zane)
- [ ] API: Team member management with corporate roles (Kael → Zane)
- [ ] Service: Travel policy enforcement (budget limits, approval workflows) (Kael → Zane)
- [ ] Service: Negotiated rate application in booking flow (Kael)
- [ ] Service: Monthly invoicing with credit limit management (Kael)
- [ ] API: Spend reports by department and traveler (Kael)

**Frontend**
- [ ] UI: Corporate admin dashboard (team, policies, spend) (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 23 criteria validated (Aïcha)

---

## Phase 8: Trust & Safety

### Skill 18: Customer Support & Disputes [0/12]

**Database**
- [ ] DB: Create `support_tickets` table with category, priority, status (Kael)
- [ ] DB: Create `ticket_messages` table with sender and internal_note flag (Kael)
- [ ] DB: Create `faq_articles` table with multi-language content (Kael)

**Backend**
- [ ] API: Support ticket CRUD with auto-categorization (Kael → Zane)
- [ ] Service: Dispute resolution workflow (48h agency SLA) (Kael)
- [ ] API: Ticket messaging with internal notes (Kael → Zane)
- [ ] Service: Auto-ticket creation from events (trip cancelled, payment failed) (Kael)
- [ ] API: FAQ knowledge base CRUD (multi-language) (Kael)
- [ ] Service: Satisfaction rating after ticket resolution (Kael)

**Frontend**
- [ ] UI: Support ticket interface (create, view, reply) (Mila → Kael)
- [ ] UI: Support agent dashboard with queue and SLA tracking (Mila → Kael)

**Sign-off**
- [ ] Acceptance: All Skill 18 criteria validated (Aïcha)

---

### Skill 20: Safety & Emergency Features [0/12]

**Database**
- [ ] DB: Create `emergency_contacts` table per user (Kael)
- [ ] DB: Create `incidents` table with type, location, photos, status (Kael)
- [ ] DB: Create `trip_shares` table with public tracking links (Kael)

**Backend**
- [ ] API: Emergency contacts CRUD (Kael)
- [ ] API: SOS trigger endpoint (3-second hold activation) (Kael → Zane)
- [ ] Service: Auto-notify emergency contacts on SOS (Kael)
- [ ] API: Trip sharing — generate public tracking link (no auth required) (Kael → Zane)
- [ ] Service: Driver safety scoring from GPS data (speeding, harsh braking) (Kael)
- [ ] API: Incident reporting with photo uploads (Kael → Zane)

**Frontend**
- [ ] UI: SOS button component (3-second hold UX) (Mila → Kael)
- [ ] UI: Trip sharing and public tracking page (Mila → Kael)
- [ ] UI: Driver safety score display (Mila → Kael)

**Sign-off (implicit in feature acceptance)**

---

### Skill 24: Fraud Detection & Prevention [0/10]

**Database**
- [ ] DB: Create `risk_scores` table per user (0-10 scale) (Kael)
- [ ] DB: Create `blocked_entities` table (phone, email, IP, device fingerprint) (Kael)

**Backend**
- [ ] Service: Duplicate account detection (phone/email/device) (Kael → Zane)
- [ ] Service: Booking velocity checks (too many bookings in short time) (Kael → Zane)
- [ ] Service: Mass cancellation pattern detection (Kael → Zane)
- [ ] Service: Payment fraud indicators (amount patterns, failed attempts) (Kael → Zane)
- [ ] Service: Fake review and promotion abuse detection (Kael → Zane)
- [ ] Service: User risk score calculation and auto-actions (Kael → Zane)
- [ ] API: Entity blocking management (Kael → Zane)

**Sign-off**
- [ ] Acceptance: All Skill 24 criteria validated (Aïcha)

---

## Phase 9: AI & Automation

### Skill 25: AI & Automation [0/14]

**Backend — Infrastructure**
- [ ] Service: Pluggable AI provider interface (Claude, OpenAI) with cost tracking (Kael)
- [ ] Service: Budget caps and usage monitoring for AI calls (Kael)

**Backend — Customer Support AI**
- [ ] Service: Auto-respond to simple support tickets (Kael → Zane)
- [ ] Service: Draft responses for complex tickets (Kael)
- [ ] Service: Auto-classify and route tickets (Kael)
- [ ] Service: Thread summarization for long conversations (Kael)

**Backend — Content Generation**
- [ ] Service: Vehicle description generation (Kael)
- [ ] Service: Promotion text generation (Kael)
- [ ] Service: Review response drafting for agencies (Kael)

**Backend — Intelligent Suggestions**
- [ ] Service: Optimal pricing suggestions per route (Kael)
- [ ] Service: Schedule optimization recommendations (Kael)
- [ ] Service: Smart seat assignment (Kael)
- [ ] Service: Conversational booking assistant (NL → structured booking params) (Kael → Zane)

**Backend — Proactive**
- [ ] Service: Auto-generated daily summaries for agencies (Kael)

**Sign-off**
- [ ] Acceptance: All Skill 25 criteria validated (Aïcha)

---

## Summary

| Phase | Skills | Tasks | Done |
|-------|--------|-------|------|
| 1. Core Foundation | 01, 02 | 38 | 32 |
| 2. Core Platform | 03, 04, 05 | 52 | 0 |
| 3. Communication | 06, 16, 19, 21 | 42 | 0 |
| 4. Hardware & Logistics | 07, 22 | 22 | 0 |
| 5. Operations & Quality | 08, 09, 10, 11 | 52 | 0 |
| 6. Monetization | 12, 13, 14, 15 | 48 | 0 |
| 7. Agent & Corporate | 17, 23 | 22 | 0 |
| 8. Trust & Safety | 18, 20, 24 | 34 | 0 |
| 9. AI & Automation | 25 | 14 | 0 |
| **Total** | **25** | **324** | **0** |
