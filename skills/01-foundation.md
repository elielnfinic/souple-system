# Skill 01: Foundation

## Objective
Set up the entire project scaffolding, authentication, authorization, multi-tenancy, and core entity management. This is the bedrock upon which all other skills build.

## Prerequisites
- Node.js 20+, npm/pnpm
- MySQL 8 running (via Docker)
- Redis 7 running (via Docker)
- S3-compatible storage (MinIO for dev)

---

## Scope

### 1. Repository Initialization

#### souple-api (AdonisJS 6)
```bash
npm init adonisjs@latest souple-api -- -K=api --db=mysql --auth-guard=access_tokens
```
Install additional packages:
- `@adonisjs/redis` — Redis integration
- `@adonisjs/mail` — Email (needed later, configure now)
- `@adonisjs/drive` — File storage (S3)
- `@adonisjs/limiter` — Rate limiting
- `@rlanz/bull-queue` — BullMQ job queue
- `luxon` — Date handling

#### souple-web (Next.js 15)
```bash
npx create-next-app@latest souple-web --typescript --tailwind --app --src-dir
```
Install additional packages:
- `@tanstack/react-query` — Data fetching
- `zustand` — State management
- `next-intl` — Internationalization
- `zod` — Client-side validation
- `@radix-ui/themes` — UI components
- `tailwindcss` v4

#### souple-shared (TypeScript library)
Plain TypeScript package with types, constants, and shared validators.
```
souple-shared/
  src/
    types/
    constants/
    validators/
  package.json
  tsconfig.json
```

#### souple-infra (Docker + Deployment)
```yaml
# docker-compose.dev.yml
services:
  mysql:
    image: mysql:8
    ports: ["3306:3306"]
    environment:
      MYSQL_ROOT_PASSWORD: souple_root
      MYSQL_DATABASE: souple_dev
      MYSQL_USER: souple
      MYSQL_PASSWORD: souple_pass
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
```

---

### 2. Database Migrations

Create migrations in this order (respecting foreign keys):

#### `users`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
email                 VARCHAR(255) UNIQUE NULL
phone                 VARCHAR(20) UNIQUE
password              VARCHAR(255)
first_name            VARCHAR(100)
last_name             VARCHAR(100)
avatar_url            VARCHAR(500) NULL
locale                VARCHAR(5) DEFAULT 'fr'
is_super_admin        BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
email_verified_at     TIMESTAMP NULL
phone_verified_at     TIMESTAMP NULL
remember_me_token     VARCHAR(255) NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `organizations`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
name                  VARCHAR(255)
slug                  VARCHAR(100) UNIQUE
type                  ENUM('agency', 'company', 'independent')
logo_url              VARCHAR(500) NULL
address               TEXT NULL
city                  VARCHAR(100)
country               VARCHAR(50) DEFAULT 'CD'
phone                 VARCHAR(20)
email                 VARCHAR(255)
tax_id                VARCHAR(100) NULL
required_kyc_level    TINYINT DEFAULT 0
is_public             BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
settings              JSON NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `organization_members`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id
user_id               BIGINT UNSIGNED FK -> users.id
role                  ENUM('owner', 'manager', 'finance', 'ticketer', 'driver')
is_active             BOOLEAN DEFAULT true
joined_at             TIMESTAMP
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(organization_id, user_id)
```

#### `cities`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
name                  VARCHAR(100)
province              VARCHAR(100)
country               VARCHAR(50) DEFAULT 'CD'
latitude              DECIMAL(10,8) NULL
longitude             DECIMAL(11,8) NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(name, province, country)
```

#### `routes`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
from_city_id          BIGINT UNSIGNED FK -> cities.id
to_city_id            BIGINT UNSIGNED FK -> cities.id
distance_km           DECIMAL(8,2) NULL
estimated_duration_min INT NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(from_city_id, to_city_id)
```

#### `route_stops`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
route_id              BIGINT UNSIGNED FK -> routes.id
city_id               BIGINT UNSIGNED FK -> cities.id
stop_order            SMALLINT
distance_from_start_km DECIMAL(8,2) NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

---

### 3. Authentication System

#### Endpoints
```
POST   /api/v1/auth/register          # Register with phone + OTP
POST   /api/v1/auth/login             # Login with phone + OTP or email + password
POST   /api/v1/auth/refresh           # Refresh access token
POST   /api/v1/auth/send-otp          # Send OTP to phone/email
POST   /api/v1/auth/verify-otp        # Verify OTP code
POST   /api/v1/auth/forgot-password   # Password reset flow
POST   /api/v1/auth/logout            # Revoke tokens
```

#### Implementation
- Use AdonisJS Access Tokens (opaque tokens, stored in `auth_access_tokens` table)
- Access token: 1 hour expiry
- Refresh token: 30 days expiry
- OTP: 6-digit code, 5-minute expiry, stored in Redis (`otp:{phone}` key)
- OTP delivery: via SMS service (stub for now, real integration in Skill 06)
- Password: bcrypt, cost factor 12

#### Auth Controller Pattern
```typescript
// app/controllers/v1/auth_controller.ts
export default class AuthController {
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)
    // Verify OTP was validated
    // Create user
    // Create access token
    // Return user + token
  }

  async login({ request, response }: HttpContext) {
    const data = await request.validateUsing(loginValidator)
    // Verify credentials (phone+OTP or email+password)
    // Create access token
    // Return user + token
  }
}
```

---

### 4. RBAC Middleware

#### Tenant Middleware
Extracts organization context from `X-Organization-Id` header or route param. Sets `ctx.organization` and `ctx.membership`.

```typescript
// app/middleware/tenant_middleware.ts
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const orgId = ctx.request.header('X-Organization-Id') || ctx.params.organizationId
    if (!orgId) return next() // Some routes don't need org context

    const org = await Organization.findOrFail(orgId)
    const membership = await OrganizationMember.query()
      .where('organization_id', orgId)
      .where('user_id', ctx.auth.user!.id)
      .where('is_active', true)
      .first()

    ctx.organization = org
    ctx.membership = membership
    return next()
  }
}
```

#### Role Middleware
Checks if user has required role within the current organization.

```typescript
// Usage in routes:
router.get('vehicles', [VehiclesController, 'index'])
  .use([middleware.auth(), middleware.tenant(), middleware.role(['owner', 'manager'])])
```

---

### 5. Audit Middleware

Automatically logs all state-changing API requests.

```typescript
// app/middleware/audit_middleware.ts
// Intercepts POST/PUT/PATCH/DELETE
// Records: user_id, organization_id, action, entity_type, entity_id, old_values, new_values, ip, user_agent
```

#### `audit_logs` migration
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK NULL
user_id               BIGINT UNSIGNED FK NULL
action                VARCHAR(100)
entity_type           VARCHAR(100)
entity_id             BIGINT UNSIGNED NULL
old_values            JSON NULL
new_values            JSON NULL
ip_address            VARCHAR(45) NULL
user_agent            TEXT NULL
created_at            TIMESTAMP
INDEX(organization_id, created_at)
INDEX(user_id, created_at)
INDEX(entity_type, entity_id)
```

---

### 6. API Response Standardization

#### Success Response
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "per_page": 20, "total": 150, "last_page": 8 }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "E_VALIDATION",
    "message": "Validation failed",
    "details": [{ "field": "phone", "message": "Required" }]
  }
}
```

Implement via a custom exception handler in `app/exceptions/handler.ts`.

---

### 7. Rate Limiting

```typescript
// start/limiter.ts
// Global: 100 req/min
// Auth endpoints: 5 req/15 min per IP
// API (authenticated): 60 req/min per user
```

---

### 8. Core CRUD Endpoints

#### Users (Super Admin)
```
GET    /api/v1/users                  # List users (paginated, filterable)
GET    /api/v1/users/:id              # Get user details
PUT    /api/v1/users/:id              # Update user
DELETE /api/v1/users/:id              # Soft-delete user
GET    /api/v1/me                     # Current user profile
PUT    /api/v1/me                     # Update own profile
```

#### Organizations
```
GET    /api/v1/organizations          # List orgs (super admin: all, user: own)
POST   /api/v1/organizations          # Create org
GET    /api/v1/organizations/:id      # Get org details
PUT    /api/v1/organizations/:id      # Update org
DELETE /api/v1/organizations/:id      # Soft-delete org
POST   /api/v1/organizations/:id/members        # Add member
DELETE /api/v1/organizations/:id/members/:userId # Remove member
PUT    /api/v1/organizations/:id/members/:userId # Update member role
```

#### Cities
```
GET    /api/v1/cities                 # List cities (public)
POST   /api/v1/cities                 # Create city (admin)
PUT    /api/v1/cities/:id             # Update city (admin)
DELETE /api/v1/cities/:id             # Delete city (admin)
```

#### Routes
```
GET    /api/v1/routes                 # List routes (public)
POST   /api/v1/routes                 # Create route (admin/manager)
GET    /api/v1/routes/:id             # Get route with stops
PUT    /api/v1/routes/:id             # Update route
DELETE /api/v1/routes/:id             # Delete route
POST   /api/v1/routes/:id/stops       # Add stop to route
PUT    /api/v1/routes/:id/stops/:stopId # Update stop
DELETE /api/v1/routes/:id/stops/:stopId # Remove stop
```

---

### 9. Frontend Foundation (Next.js)

#### Pages to implement
- `/` — Landing page (marketing)
- `/auth/login` — Login form (phone OTP + email/password)
- `/auth/register` — Registration form
- `/auth/verify` — OTP verification
- Dashboard layout shell with sidebar navigation (role-aware)

#### Core setup
- API client (`lib/api-client.ts`) — Typed fetch wrapper with auth token injection
- Auth provider (`providers/AuthProvider.tsx`) — Login state, token refresh
- Organization provider (`providers/OrganizationProvider.tsx`) — Current org context
- i18n setup with `next-intl` (fr, en initially)
- Tailwind + Radix UI theme configuration
- React Query provider setup

---

## Acceptance Criteria

1. `docker compose up` starts MySQL, Redis, MinIO
2. `node ace migration:run` creates all foundation tables
3. User can register with phone + OTP, receive access token
4. User can login, get token, access protected routes
5. Super admin can CRUD users, organizations, cities, routes
6. Organization owner can add/remove members with roles
7. All mutations are logged in audit_logs
8. Rate limiting works (returns 429 on abuse)
9. API returns consistent JSON envelope on success and error
10. Next.js app renders login page and dashboard shell
11. Auth flow works end-to-end (register → login → dashboard)

---

## Dependencies
- None (this is the first skill)

## Blocks
- All other skills depend on this one
