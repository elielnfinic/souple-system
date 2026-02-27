import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// ─── Health check (no auth) ───────────────────────────────────────────────────
router.get('/health', async ({ response }) => {
  return response.ok({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── API v1 ───────────────────────────────────────────────────────────────────
router.group(() => {

  // ─── Auth (public) ──────────────────────────────────────────────────────
  router.group(() => {
    router.post('/send-otp',   [() => import('#controllers/v1/auth_controller'), 'sendOtp'])
    router.post('/verify-otp', [() => import('#controllers/v1/auth_controller'), 'verifyOtp'])
    router.post('/register',   [() => import('#controllers/v1/auth_controller'), 'register'])
    router.post('/login',      [() => import('#controllers/v1/auth_controller'), 'login'])
  }).prefix('/auth')

  // ─── Auth (protected) ───────────────────────────────────────────────────
  router.group(() => {
    router.post('/auth/logout', [() => import('#controllers/v1/auth_controller'), 'logout'])
    router.get('/me',           [() => import('#controllers/v1/auth_controller'), 'me'])
    router.put('/me',           [() => import('#controllers/v1/auth_controller'), 'updateMe'])
  }).use(middleware.auth())

  // ─── Users (protected) ──────────────────────────────────────────────────
  router.group(() => {
    router.get('/',     [() => import('#controllers/v1/users_controller'), 'index'])
    router.get('/:id',  [() => import('#controllers/v1/users_controller'), 'show'])
    router.put('/:id',  [() => import('#controllers/v1/users_controller'), 'update'])
    router.delete('/:id', [() => import('#controllers/v1/users_controller'), 'destroy'])
  }).prefix('/users').use(middleware.auth())

  // ─── Organizations (protected) ──────────────────────────────────────────
  router.group(() => {
    router.get('/',    [() => import('#controllers/v1/organizations_controller'), 'index'])
    router.post('/',   [() => import('#controllers/v1/organizations_controller'), 'store'])
    router.get('/:id', [() => import('#controllers/v1/organizations_controller'), 'show'])
    router.put('/:id', [() => import('#controllers/v1/organizations_controller'), 'update'])
    router.delete('/:id', [() => import('#controllers/v1/organizations_controller'), 'destroy'])

    // Members
    router.post('/:id/members',                    [() => import('#controllers/v1/organizations_controller'), 'addMember'])
    router.delete('/:id/members/:userId',          [() => import('#controllers/v1/organizations_controller'), 'removeMember'])
    router.put('/:id/members/:userId',             [() => import('#controllers/v1/organizations_controller'), 'updateMemberRole'])
  }).prefix('/organizations').use([middleware.auth(), middleware.tenant()])

  // ─── Cities (public read, admin write) ──────────────────────────────────
  router.group(() => {
    router.get('/',    [() => import('#controllers/v1/cities_controller'), 'index'])
    router.get('/:id', [() => import('#controllers/v1/cities_controller'), 'show'])
  }).prefix('/cities')

  router.group(() => {
    router.post('/',      [() => import('#controllers/v1/cities_controller'), 'store'])
    router.put('/:id',    [() => import('#controllers/v1/cities_controller'), 'update'])
    router.delete('/:id', [() => import('#controllers/v1/cities_controller'), 'destroy'])
  }).prefix('/cities').use(middleware.auth())

  // ─── Routes (public read, auth write) ───────────────────────────────────
  router.group(() => {
    router.get('/',    [() => import('#controllers/v1/routes_controller'), 'index'])
    router.get('/:id', [() => import('#controllers/v1/routes_controller'), 'show'])

    // Write operations require auth
    router.group(() => {
      router.post('/',                         [() => import('#controllers/v1/routes_controller'), 'store'])
      router.put('/:id',                       [() => import('#controllers/v1/routes_controller'), 'update'])
      router.delete('/:id',                    [() => import('#controllers/v1/routes_controller'), 'destroy'])
      router.post('/:id/stops',                [() => import('#controllers/v1/routes_controller'), 'addStop'])
      router.put('/:id/stops/:stopId',         [() => import('#controllers/v1/routes_controller'), 'updateStop'])
      router.delete('/:id/stops/:stopId',      [() => import('#controllers/v1/routes_controller'), 'removeStop'])
    }).use([middleware.auth(), middleware.tenant()])
  }).prefix('/routes')

}).prefix('/api/v1')
