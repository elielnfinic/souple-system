# Souple System — Testing Guide

> **Goal**: Get the full Souple stack running locally so you can test the API and Web UI end-to-end.
>
> **Prerequisites**: Docker Desktop, Node.js 20+, `npm` or `pnpm` or `bun`

---

## 1. Start Infrastructure (Docker)

```bash
cd souple-infra
docker compose -f docker-compose.dev.yml up -d
```

Wait ~15 seconds for MySQL to initialize, then verify services are healthy:

```bash
docker compose -f docker-compose.dev.yml ps
```

Expected: `mysql`, `redis`, `minio`, `mailpit` all showing **healthy** or **running**.

| Service | URL | Credentials |
|---------|-----|-------------|
| MySQL   | `localhost:3306` | user: `souple`, pass: `souple_pass`, db: `souple_dev` |
| Redis   | `localhost:6379` | no password |
| MinIO   | http://localhost:9001 | user: `minioadmin`, pass: `minioadmin123` |
| Mailpit | http://localhost:8025 | no auth — view all outgoing emails here |

---

## 2. Configure the API

```bash
cd souple-api
cp .env .env.local 2>/dev/null || true   # .env already has dev values
```

The `.env` already has the correct dev credentials. No changes needed.

### Run Migrations

```bash
node ace migration:run
```

You should see 29 migrations run successfully (001 through 029).

### Seed Default Data

```bash
node ace db:seed
```

This seeds **3 seat classes**: VIP, Business, Economy.

### Start the API

```bash
node ace serve --watch
```

API is running at **http://localhost:3333**

Test the health endpoint:

```bash
curl http://localhost:3333/health
# → {"status":"ok","timestamp":"..."}
```

---

## 3. Configure the Web

```bash
cd souple-web
```

Create `.env.local` if it doesn't exist:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
EOF
```

Install dependencies (if not already done):

```bash
npm install
# or: pnpm install / bun install
```

### Start the Web Dev Server

```bash
npm run dev
# or: pnpm dev / bun dev
```

Web app is running at **http://localhost:3000**

---

## 4. Test the Auth Flow

### Register a new user

```bash
curl -X POST http://localhost:3333/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+243812345678","purpose":"register"}'
```

Check Mailpit at http://localhost:8025 for the OTP, **or** check the API server console log (SMS provider is `stub` — OTP is logged to console in dev).

```bash
# Verify OTP (replace 123456 with actual code from logs/mailpit)
curl -X POST http://localhost:3333/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+243812345678","code":"123456","purpose":"register"}'
```

```bash
# Complete registration
curl -X POST http://localhost:3333/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+243812345678",
    "full_name": "Test User",
    "locale": "fr",
    "timezone": "Africa/Kinshasa"
  }'
```

### Login

```bash
# Step 1: Request OTP
curl -X POST http://localhost:3333/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+243812345678","purpose":"login"}'

# Step 2: Verify OTP → get access_token
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+243812345678","code":"123456","purpose":"login"}'
```

Save the `access_token` from the response — use it in the `Authorization: Bearer <token>` header for all protected requests.

### Test via Web UI

1. Open http://localhost:3000/fr/auth/login
2. Enter phone number → receive OTP (check console logs)
3. Enter OTP → redirected to Dashboard

---

## 5. Test Core API Endpoints

Use `TOKEN=your_access_token` from login above.

### Cities

```bash
curl http://localhost:3333/api/v1/cities
```

### Create a City (requires auth)

```bash
curl -X POST http://localhost:3333/api/v1/cities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kinshasa","code":"KIN","country":"CD","timezone":"Africa/Kinshasa","lat":-4.3317,"lng":15.3342}'
```

### Create a Vehicle

```bash
# First create an org
curl -X POST http://localhost:3333/api/v1/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Bus Co","type":"transport_company","country":"CD","currency":"CDF"}'

# Then create vehicle (use org ID from response)
curl -X POST http://localhost:3333/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"type":"minibus","brand":"Toyota","model":"Hiace","year":2020,"color":"White","plate_number":"KIN-1234","total_seats":14}'
```

---

## 6. Test the Web Dashboard

After logging in at http://localhost:3000:

| Feature | URL | Notes |
|---------|-----|-------|
| Dashboard | `/fr/dashboard` | Overview stats |
| Fleet | `/fr/dashboard/fleet` | Vehicle list, add new vehicle |
| Trips | `/fr/dashboard/trips` | Trip management |
| POS | `/fr/dashboard/pos` | Ticketer point-of-sale |
| Prices | `/fr/dashboard/prices` | Price rules per route |
| Payments | `/fr/dashboard/payments` | Payment history |
| Messages | `/fr/dashboard/messages` | In-app messaging (split-panel) |
| Notifications | `/fr/dashboard/notifications` | Notification history + preferences |

---

## 7. Test USSD (Simulated)

The USSD endpoint accepts `text/plain` form-encoded requests (Africa's Talking format):

```bash
# New session (text is empty)
curl -X POST http://localhost:3333/api/v1/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test-session-001&serviceCode=*123%23&phoneNumber=%2B243812345678&text="

# Select language (1 = Français)
curl -X POST http://localhost:3333/api/v1/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test-session-001&serviceCode=*123%23&phoneNumber=%2B243812345678&text=1"

# Select option 1 (Book a trip)
curl -X POST http://localhost:3333/api/v1/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test-session-001&serviceCode=*123%23&phoneNumber=%2B243812345678&text=1*1"
```

Response format: `CON <menu text>` (continue) or `END <message>` (terminate).

---

## 8. Test SMS Commands

```bash
curl -X POST http://localhost:3333/api/v1/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{"from":"+243812345678","to":"20880","text":"HELP","id":"sms-001"}'

# Book: BOOK Kinshasa Lubumbashi 2026-03-15
curl -X POST http://localhost:3333/api/v1/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{"from":"+243812345678","to":"20880","text":"BOOK Kinshasa Lubumbashi 2026-03-15","id":"sms-002"}'

# Status check
curl -X POST http://localhost:3333/api/v1/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{"from":"+243812345678","to":"20880","text":"STATUS SP-ABC12345","id":"sms-003"}'
```

---

## 9. Test WhatsApp Webhook

```bash
# Step 1: Verify webhook (Meta verification challenge)
curl "http://localhost:3333/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=YOUR_WA_VERIFY_TOKEN"
# → "test123"

# Step 2: Send a simulated message
curl -X POST http://localhost:3333/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "+243812345678",
            "id": "wamid.test001",
            "text": {"body": "Bonjour"},
            "type": "text",
            "timestamp": "1700000000"
          }],
          "contacts": [{"wa_id": "+243812345678", "profile": {"name": "Test User"}}]
        }
      }]
    }]
  }'
# → {"status":"ok"} — processing happens async
```

> **Note**: WhatsApp sends are stubs in dev unless `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set in `.env`.

---

## 10. Test In-App Messaging

```bash
TOKEN=your_access_token

# Create a conversation (requires booking_id or trip_id)
curl -X POST http://localhost:3333/api/v1/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"support","booking_id":1}'

# List conversations
curl http://localhost:3333/api/v1/conversations \
  -H "Authorization: Bearer $TOKEN"

# Send a message
curl -X POST http://localhost:3333/api/v1/conversations/1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bonjour, où est mon bus?","type":"text"}'

# Get unread count
curl http://localhost:3333/api/v1/conversations/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

---

## 11. Troubleshooting

### MySQL connection refused
```bash
# Check container status
docker compose -f souple-infra/docker-compose.dev.yml ps

# Restart MySQL if needed
docker compose -f souple-infra/docker-compose.dev.yml restart mysql
```

### Migration fails
```bash
# Rollback and re-run
cd souple-api
node ace migration:rollback --batch 1
node ace migration:run
```

### OTP not received
- SMS provider is `stub` in dev — **check the API terminal output** for the OTP code printed in the log.
- For email OTPs: check Mailpit at http://localhost:8025

### BullMQ / Redis errors
```bash
# Check Redis is running
redis-cli ping
# → PONG

# Or via Docker
docker compose -f souple-infra/docker-compose.dev.yml logs redis
```

### Web app API errors
- Check `NEXT_PUBLIC_API_URL` in `souple-web/.env.local` points to `http://localhost:3333/api/v1`
- Check CORS: API `config/cors.ts` must include `http://localhost:3000`

---

## 12. Quick Start (All-in-One)

```bash
# Terminal 1 — Infrastructure
cd souple-infra && docker compose -f docker-compose.dev.yml up

# Terminal 2 — API
cd souple-api && node ace migration:run && node ace db:seed && node ace serve --watch

# Terminal 3 — Web
cd souple-web && npm install && npm run dev
```

Then open http://localhost:3000 in your browser.

---

## 13. Skills Implemented (Testable)

| Skill | Feature | Status |
|-------|---------|--------|
| 01 | Auth (OTP), Users, Organizations, Cities, Routes | ✅ Full |
| 02 | Design System, UI Components | ✅ Full |
| 03 | Fleet / Vehicle Management | ✅ Full |
| 04 | Trips, Segment Booking, POS | ✅ Full |
| 05 | Payments (MTN MoMo sandbox, Cash, Stripe) | ✅ Full |
| 06 | Notifications (Email, SMS, Telegram, Push) | ✅ Full |
| 16 | USSD state machine + SMS commands | ✅ Backend |
| 19 | WhatsApp Bot (natural language booking) | ✅ Backend |
| 21 | In-App Messaging (chat, canned responses) | ✅ Full |
