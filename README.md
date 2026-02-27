# Souple System

> **The intercity travel OS for emerging markets.**

Souple is a multi-sided transportation platform that connects passengers, bus operators, vehicle rental agencies, and cargo senders — built from the ground up for the realities of the DRC and similar markets: unreliable connectivity, feature-phone dominance, dual-currency economies, and cash-first payments.

---

## What it does

Souple gives transport operators a full digital backbone — trip scheduling, seat management, ticketing, payments, driver manifests, and reporting — while giving passengers a frictionless way to book intercity trips across any channel: web, mobile, USSD, SMS, or WhatsApp.

**For passengers:** Search trips, pick a seat, pay with mobile money or cash, get a QR ticket, and track your bus in real time.

**For operators:** Manage your fleet, schedule trips, control pricing per route segment, sell through ticketers or agents, and get daily revenue reports.

**For the platform:** Marketplace discovery, subscription billing, fraud detection, KYC, and an AI layer that handles first-line support and generates pricing suggestions.

---

## Key design principles

- **Segment-based everything** — Pricing, seat availability, and capacity are calculated per route segment, not per trip. A seat can be booked Kinshasa → Kikwit by one passenger and Kikwit → Kananga by another on the same trip.
- **DRC-first** — 70% of users are on feature phones. USSD and SMS booking are first-class channels, not afterthoughts.
- **Offline-first ticketing** — Ticketers operate with full functionality offline; data syncs reliably when connectivity returns.
- **Role-based UI density** — Passengers get a clean, spacious interface. Operators and ticketers get data-dense dashboards optimized for speed.
- **AI assists, humans decide** — AI handles auto-responses, pricing suggestions, and content generation. Humans make final calls on disputes, refunds, and approvals.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Backend** | AdonisJS 6, Node.js 20+, TypeScript (strict) |
| **Database** | MySQL 8, Redis 7 |
| **Queue** | BullMQ |
| **Frontend** | Next.js 15, React 18+, Tailwind CSS v4, Radix UI Themes |
| **State** | Zustand (client), TanStack Query (server) |
| **i18n** | next-intl — French (default), English, Lingala, Swahili |
| **Storage** | S3 / MinIO |
| **Infra** | Docker Compose, Nginx, Certbot |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Prometheus, Grafana, Sentry |

### Architecture highlights

- OTP-based authentication — no passwords
- RBAC middleware on every route (`super_admin`, `org_admin`, `manager`, `driver`, `ticketer`, `passenger`)
- Standardized API response envelope across all endpoints
- Exchange rates locked at transaction time; CDF + USD dual-currency throughout
- All dates stored in UTC, displayed in local timezone via Luxon
- Redis-based seat locking during booking flow (TTL-gated, no double-booking)
- Pluggable payment layer: MTN MoMo, Orange Money, Airtel Money, Stripe, stablecoins, and cash

---

## Platform scope

The system is organized into 25 feature modules across 9 phases:

| Phase | Modules |
|---|---|
| Core Foundation | Auth, RBAC, routes, design system |
| Core Platform | Fleet, trips & booking, payments |
| Communication | Notifications, USSD/SMS, WhatsApp bot, in-app messaging |
| Hardware & Logistics | GPS tracking, thermal printing, QR scanning, parcel delivery |
| Operations & Quality | Offline support, dashboards, KYC, testing & deployment |
| Monetization | Marketplace, subscription billing, multi-currency, loyalty & promotions |
| Agent & Corporate | Reseller network, B2B accounts |
| Trust & Safety | Customer support, emergency features, fraud detection |
| AI & Automation | Auto-support, pricing suggestions, conversational booking assistant |

---

## Project structure

```
souple-system/
├── skills/       # 25 feature specifications
├── team/         # AI agent persona definitions (PM, Dev, Designer, QA)
├── PROGRESS.md   # Full task checklist (324 tasks across 25 skills)
└── CLAUDE.md     # Project conventions and architecture guide
```

---

## License

Copyright © 2024 Souple. All rights reserved.

This software and its source code are proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software, in whole or in part, is strictly prohibited without prior written permission from Souple.
