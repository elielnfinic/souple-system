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
├── souple-api/       # AdonisJS 6 backend
├── souple-web/       # Next.js 15 frontend
├── souple-shared/    # Shared TypeScript types & constants
├── souple-infra/     # Docker Compose services (MySQL, Redis, MinIO, Mailpit)
├── skills/           # 25 feature specifications
├── team/             # AI agent persona definitions (PM, Dev, Designer, QA)
├── PROGRESS.md       # Full task checklist (324 tasks across 25 skills)
└── CLAUDE.md         # Project conventions and architecture guide
```

---

## Getting started

### Prerequisites

- **Node.js** 20+ (`node -v`)
- **npm** 10+ (`npm -v`)
- **MySQL** 8 (local install **or** Docker — see options below)
- **Redis** 7 (local install **or** Docker — see options below)

---

### Option A — Run everything locally (no Docker)

This is the simplest path if you already have MySQL and Redis installed.

#### 1. Install MySQL 8 and Redis

**macOS (Homebrew):**
```bash
brew install mysql@8.0 redis
brew services start mysql@8.0
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install -y mysql-server redis-server
sudo systemctl start mysql redis
```

**Windows:** Install [MySQL 8 Community](https://dev.mysql.com/downloads/mysql/) and [Redis for Windows](https://github.com/tporadowski/redis/releases), then start both services.

#### 2. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE souple_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'souple'@'localhost' IDENTIFIED BY 'souple_pass'; GRANT ALL ON souple_dev.* TO 'souple'@'localhost'; FLUSH PRIVILEGES;"
```

#### 3. Build the shared package

```bash
cd souple-shared
npm install
npm run build
cd ..
```

#### 4. Set up and run the API

```bash
cd souple-api
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env — set DB_HOST=127.0.0.1, DB_PASSWORD=souple_pass (or your root password)
# Generate an app key and paste it as APP_KEY in .env:
node -e "const{randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64'))"

# Run database migrations
node ace migration:run

# Start the development server (with hot-reload)
npm run dev
```

The API will be available at **http://localhost:3333**. Test it:
```bash
curl http://localhost:3333/health
# → {"status":"ok","timestamp":"..."}
```

#### 5. Set up and run the frontend

Open a **new terminal**:

```bash
cd souple-web
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local if your API runs on a different port

# Start the development server
npm run dev
```

The web app will be available at **http://localhost:3000**.

---

### Option B — Services in Docker, apps running locally

Use Docker only for the backing services (MySQL, Redis, MinIO, Mailpit) and run the Node.js apps natively. This is the **recommended development setup**.

#### 1. Start the backing services

```bash
cd souple-infra
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **MySQL 8** on `localhost:3306` (user: `souple`, password: `souple_pass`, db: `souple_dev`)
- **Redis 7** on `localhost:6379`
- **MinIO** on `localhost:9000` (S3-compatible object storage, console at `localhost:9001`)
- **Mailpit** on `localhost:1025` (email catcher, UI at `localhost:8025`)

#### 2. Build shared package and run the apps

Follow steps **3 → 5** from [Option A](#option-a--run-everything-locally-no-docker) above. The default `.env.example` is already pre-configured for this setup.

---

### Option C — Full Docker stack

Run the entire application (API + Web + services) with Docker Compose.

```bash
# From the repo root
cp souple-api/.env.example souple-api/.env
# Edit souple-api/.env and set APP_KEY:
# node -e "const{randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64'))"

docker compose up --build
```

- **Frontend** → http://localhost:3000
- **API** → http://localhost:3333
- **API health** → http://localhost:3333/health

---

### Useful commands

```bash
# API — run migrations
cd souple-api && node ace migration:run

# API — rollback last migration batch
cd souple-api && node ace migration:rollback

# API — generate a new app key
node -e "const{randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64'))"

# API — run tests
cd souple-api && npm test

# Web — type check
cd souple-web && npx tsc --noEmit

# Web — lint
cd souple-web && npm run lint
```

---

### Environment variables reference

**`souple-api/.env`** (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `APP_KEY` | *(required)* | `node -e "const{randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64'))"` |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `souple` | MySQL user |
| `DB_PASSWORD` | `souple_pass` | MySQL password |
| `DB_DATABASE` | `souple_dev` | Database name |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

**`souple-web/.env.local`** (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3333` | Backend API base URL |

---

## License

Copyright © 2024 Souple. All rights reserved.

This software and its source code are proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software, in whole or in part, is strictly prohibited without prior written permission from Souple.
