# Skill 11: Testing, Deployment & Polish

## Objective
Prepare the Souple platform for production deployment. Includes comprehensive testing (unit, integration, E2E), internationalization, Docker production setup, CI/CD pipelines, database backups, SSL, monitoring, and performance optimization.

## Prerequisites
- All skills 01-10 completed (or at minimum 01-05)
- VPS server provisioned (Ubuntu 22.04+, minimum 4GB RAM, 2 vCPU)
- Domain name configured (e.g., souple.com, app.souple.com, api.souple.com)

---

## Scope

### 1. Testing

#### Backend Tests (Japa)

**Unit Tests**
```
tests/unit/
  services/
    booking_service.test.ts       # Booking creation, cancellation, sync
    payment_service.test.ts       # Payment initiation, webhook processing
    price_service.test.ts         # Price calculation with rules
    kyc_service.test.ts           # KYC level calculation
    notification_service.test.ts  # Channel routing, preference checks
    gps_service.test.ts           # Position recording, Redis caching
    receipt_service.test.ts       # Receipt generation
    sync_service.test.ts          # Offline sync conflict resolution
  models/
    user.test.ts                  # Model relationships, hooks
    booking.test.ts               # Booking code generation, QR
    trip.test.ts                  # Seat materialization
  validators/
    booking_validator.test.ts     # Validation rules
    vehicle_validator.test.ts
  utils/
    currency.test.ts
    date.test.ts
```

**Integration/Functional Tests**
```
tests/functional/
  auth/
    register.test.ts              # Full registration flow
    login.test.ts                 # Login with OTP and password
    token_refresh.test.ts
  organizations/
    crud.test.ts                  # CRUD operations
    members.test.ts               # Member management, role changes
  vehicles/
    crud.test.ts
    seat_layouts.test.ts
  trips/
    crud.test.ts
    search.test.ts                # Trip search with filters
    seat_materialization.test.ts  # Seats created from layout
  bookings/
    create.test.ts                # Full booking flow
    cancel.test.ts
    check_in.test.ts
    concurrent.test.ts            # Race condition: same seat booked twice
    offline_sync.test.ts          # Batch sync with conflicts
  payments/
    initiate.test.ts
    webhook.test.ts               # Webhook processing per provider
    refund.test.ts
    cash.test.ts
  parcels/
    crud.test.ts
    scan_workflow.test.ts
  rbac/
    role_enforcement.test.ts      # Each role can only access their endpoints
    tenant_scoping.test.ts        # Org A can't see Org B's data
  kyc/
    document_upload.test.ts
    review_flow.test.ts
    level_enforcement.test.ts     # Booking blocked without KYC
```

**Test Database**
```typescript
// Use a separate MySQL database for tests
// Migrations run before test suite
// Factories for generating test data:
//   UserFactory, OrganizationFactory, VehicleFactory, TripFactory, BookingFactory
// Transactions rolled back after each test (or truncate tables)
```

#### Frontend E2E Tests (Playwright)
```
tests/e2e/
  auth.spec.ts                    # Register, login, logout
  booking-flow.spec.ts            # Search → select seats → book → pay → ticket
  ticketer-pos.spec.ts            # Quick ticket selling flow
  agency-dashboard.spec.ts        # Fleet, trips, bookings management
  admin-dashboard.spec.ts         # Org/user management
  offline-mode.spec.ts            # Simulate offline, create booking, sync
  responsive.spec.ts              # Mobile/tablet viewport tests
```

#### Load Testing (k6)
```javascript
// tests/load/booking-flow.js
// Simulate 1000 concurrent users searching and booking
// Target: < 200ms P95 response time for search
// Target: < 500ms P95 for booking creation
// Target: Zero seat double-bookings under load

// tests/load/gps-tracking.js
// Simulate 5000 vehicles sending GPS updates every 15s
// Target: All updates processed within 5s
```

---

### 2. Internationalization (i18n)

#### Languages
```
src/i18n/
  en.json     # English
  fr.json     # French (primary)
  ln.json     # Lingala
  sw.json     # Swahili
```

#### Key translation namespaces
```json
{
  "common": { "save", "cancel", "delete", "edit", "search", "loading", "error" },
  "auth": { "login", "register", "logout", "forgot_password", "otp_sent" },
  "booking": { "search_trips", "select_seats", "passenger_info", "confirm_booking" },
  "trip": { "departure", "arrival", "seats_available", "status" },
  "vehicle": { "type", "brand", "model", "plate_number", "seats" },
  "payment": { "method", "amount", "status", "receipt" },
  "dashboard": { "revenue", "trips_today", "bookings", "occupancy" },
  "notification": { "booking_confirmed", "payment_receipt", "trip_reminder" },
  "parcel": { "sender", "receiver", "tracking_code", "status" },
  "kyc": { "level", "document_type", "upload", "pending_review" },
  "errors": { "validation", "not_found", "unauthorized", "forbidden", "server_error" }
}
```

#### Backend i18n
```typescript
// AdonisJS i18n for validation messages and email templates
// Locale resolved from: user.locale field, Accept-Language header, or default 'fr'
```

---

### 3. Production Docker Setup

#### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  api:
    build:
      context: ../souple-api
      dockerfile: Dockerfile
    restart: always
    env_file: .env.prod
    depends_on:
      - mysql
      - redis
    networks:
      - souple-net
    deploy:
      replicas: 2                    # 2 API instances behind Nginx

  worker:
    build:
      context: ../souple-api
      dockerfile: Dockerfile
    command: node ace queue:listen
    restart: always
    env_file: .env.prod
    depends_on:
      - mysql
      - redis
    networks:
      - souple-net

  web:
    build:
      context: ../souple-web
      dockerfile: Dockerfile
    restart: always
    env_file: .env.web.prod
    networks:
      - souple-net

  mysql:
    image: mysql:8
    restart: always
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/my.cnf:/etc/mysql/conf.d/custom.cnf
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
      MYSQL_DATABASE: souple_prod
      MYSQL_USER: souple
      MYSQL_PASSWORD_FILE: /run/secrets/mysql_password
    networks:
      - souple-net
    secrets:
      - mysql_root_password
      - mysql_password

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - souple-net

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/var/www/certbot
    depends_on:
      - api
      - web
    networks:
      - souple-net

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_data:/var/www/certbot
      - ./nginx/ssl:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h; done'"

volumes:
  mysql_data:
  redis_data:
  certbot_data:

networks:
  souple-net:

secrets:
  mysql_root_password:
    file: ./secrets/mysql_root_password.txt
  mysql_password:
    file: ./secrets/mysql_password.txt
```

#### Nginx Configuration
```nginx
# nginx/nginx.conf
upstream api_backend {
    server api:3333;
    server api:3333;  # replicas handled by Docker
}

upstream web_frontend {
    server web:3000;
}

server {
    listen 80;
    server_name souple.com app.souple.com api.souple.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.souple.com;

    ssl_certificate /etc/nginx/ssl/live/api.souple.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/api.souple.com/privkey.pem;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE for GPS tracking (long-lived connections)
    location /api/v1/gps/ {
        proxy_pass http://api_backend;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}

server {
    listen 443 ssl http2;
    server_name app.souple.com;

    ssl_certificate /etc/nginx/ssl/live/app.souple.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/app.souple.com/privkey.pem;

    location / {
        proxy_pass http://web_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### API Dockerfile
```dockerfile
# souple-api/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ace build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/build ./
RUN npm ci --production
EXPOSE 3333
CMD ["node", "bin/server.js"]
```

#### Web Dockerfile
```dockerfile
# souple-web/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

### 4. CI/CD (GitHub Actions)

```yaml
# .github/workflows/api-ci.yml
name: API CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: souple_test
        ports: ['3306:3306']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node ace migration:run
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/souple
            git pull origin main
            docker compose -f docker-compose.prod.yml build api worker
            docker compose -f docker-compose.prod.yml up -d api worker
            docker compose -f docker-compose.prod.yml exec api node ace migration:run --force
```

---

### 5. Database Backups

```bash
# scripts/backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/souple/backups"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Dump database
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" souple_prod \
  --single-transaction --routines --triggers \
  | gzip > "$BACKUP_DIR/souple_${DATE}.sql.gz"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/souple_${DATE}.sql.gz" s3://souple-backups/db/

# Clean old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Cron: 0 2 * * * /opt/souple/scripts/backup-db.sh
```

---

### 6. Monitoring

#### Prometheus Metrics
```typescript
// app/middleware/metrics_middleware.ts
// Expose metrics at /metrics endpoint:
// - http_requests_total (method, path, status_code)
// - http_request_duration_seconds (histogram)
// - active_connections
// - db_query_duration_seconds
// - queue_jobs_total (queue, status)
// - queue_jobs_active
```

#### Grafana Dashboards
- **API Performance** — Request rate, latency P50/P95/P99, error rate
- **Business Metrics** — Bookings/hour, revenue/day, active users
- **Infrastructure** — CPU, memory, disk, MySQL connections, Redis memory
- **Queue Health** — Jobs processed/failed, queue depth, processing time

#### Sentry Error Tracking
```typescript
// Both API and Web:
// Capture unhandled exceptions
// Add context: user ID, org ID, request URL
// Source maps for frontend
```

#### Health Checks
```
GET /health         # Basic health (API is up)
GET /health/ready   # Readiness (DB + Redis connected)
```

---

### 7. Performance Optimizations

- **Database indexing**: Verify all query patterns have covering indexes
- **Query optimization**: Use `preload()` and `select()` to avoid N+1 and over-fetching
- **Redis caching**: Cache frequent reads (trip search results, seat availability) with 30s TTL
- **Connection pooling**: MySQL pool size = 2 * CPU cores + number of disks
- **Gzip compression**: Enable in Nginx for API responses
- **Static assets**: CDN or Nginx caching with long cache headers
- **Image optimization**: Resize vehicle photos on upload (thumbnail + medium + original)
- **Pagination**: All list endpoints use cursor-based or offset pagination
- **Background processing**: Heavy operations (report generation, bulk notifications) via BullMQ

---

## Acceptance Criteria

1. All unit tests pass (> 80% coverage on services)
2. All integration tests pass (cover critical flows)
3. E2E tests pass for booking flow, POS, and admin CRUD
4. Load test: 1000 concurrent booking attempts with zero double-bookings
5. Load test: search endpoint < 200ms P95 under 500 concurrent users
6. App is available in 4 languages (fr, en, ln, sw)
7. Docker production setup runs with `docker compose up -d`
8. SSL certificates auto-renew via Certbot
9. CI/CD deploys to VPS on push to main
10. Database backups run daily and upload to S3
11. Grafana dashboards show API performance and business metrics
12. Sentry captures errors with proper context
13. Health check endpoints respond correctly

---

## Dependencies
- All skills 01-10

## Blocks
- Production launch
