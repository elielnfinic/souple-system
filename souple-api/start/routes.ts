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

  // ─── Seat Classes (public read, admin write) ─────────────────────────────────
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/seat_classes_controller'), 'index'])
    router.get('/:id', [() => import('#controllers/v1/seat_classes_controller'), 'show'])
  }).prefix('/seat-classes')

  router.group(() => {
    router.post('/', [() => import('#controllers/v1/seat_classes_controller'), 'store'])
    router.put('/:id', [() => import('#controllers/v1/seat_classes_controller'), 'update'])
    router.delete('/:id', [() => import('#controllers/v1/seat_classes_controller'), 'destroy'])
  }).prefix('/seat-classes').use(middleware.auth())

  // ─── Vehicles ────────────────────────────────────────────────────────────────
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/vehicles_controller'), 'index'])
    router.get('/:id', [() => import('#controllers/v1/vehicles_controller'), 'show'])

    router.group(() => {
      router.post('/', [() => import('#controllers/v1/vehicles_controller'), 'store'])
      router.put('/:id', [() => import('#controllers/v1/vehicles_controller'), 'update'])
      router.delete('/:id', [() => import('#controllers/v1/vehicles_controller'), 'destroy'])
      router.put('/:id/verify', [() => import('#controllers/v1/vehicles_controller'), 'verify'])

      // Seat layouts nested under vehicles
      router.get('/:vehicleId/seat-layouts', [() => import('#controllers/v1/seat_layouts_controller'), 'index'])
      router.post('/:vehicleId/seat-layouts', [() => import('#controllers/v1/seat_layouts_controller'), 'store'])
      router.get('/:vehicleId/seat-layouts/:id', [() => import('#controllers/v1/seat_layouts_controller'), 'show'])
      router.put('/:vehicleId/seat-layouts/:id', [() => import('#controllers/v1/seat_layouts_controller'), 'update'])
      router.delete('/:vehicleId/seat-layouts/:id', [() => import('#controllers/v1/seat_layouts_controller'), 'destroy'])
      router.put('/:vehicleId/seat-layouts/:id/default', [() => import('#controllers/v1/seat_layouts_controller'), 'setDefault'])
    }).use(middleware.auth())
  }).prefix('/vehicles')

  // ─── Trips ───────────────────────────────────────────────────────────────────
  router.group(() => {
    // Public: search
    router.get('/search', [() => import('#controllers/v1/trips_controller'), 'search'])

    // Public read
    router.get('/', [() => import('#controllers/v1/trips_controller'), 'index'])
    router.get('/:id', [() => import('#controllers/v1/trips_controller'), 'show'])
    router.get('/:id/availability', [() => import('#controllers/v1/trips_controller'), 'availability'])

    // Auth required
    router.group(() => {
      router.post('/', [() => import('#controllers/v1/trips_controller'), 'store'])
      router.put('/:id', [() => import('#controllers/v1/trips_controller'), 'update'])
      router.delete('/:id', [() => import('#controllers/v1/trips_controller'), 'destroy'])
      router.get('/:id/manifest', [() => import('#controllers/v1/trips_controller'), 'manifest'])
    }).use(middleware.auth())
  }).prefix('/trips')

  // ─── Bookings ─────────────────────────────────────────────────────────────────
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/bookings_controller'), 'index'])
    router.post('/', [() => import('#controllers/v1/bookings_controller'), 'store'])
    router.get('/:id', [() => import('#controllers/v1/bookings_controller'), 'show'])
    router.put('/:id/cancel', [() => import('#controllers/v1/bookings_controller'), 'cancel'])
  }).prefix('/bookings').use(middleware.auth())

  // ─── Payments ─────────────────────────────────────────────────────────────────
  router.post('/payments/webhook/:provider', [() => import('#controllers/v1/payments_controller'), 'webhook'])
  router.group(() => {
    router.get('/payments', [() => import('#controllers/v1/payments_controller'), 'index'])
    router.post('/payments', [() => import('#controllers/v1/payments_controller'), 'store'])
    router.get('/payments/:id', [() => import('#controllers/v1/payments_controller'), 'show'])
    router.post('/payments/:id/refund', [() => import('#controllers/v1/payments_controller'), 'refund'])
  }).use(middleware.auth())

  // ─── Notifications ────────────────────────────────────────────────────────────
  router.group(() => {
    router.get('/notifications', [() => import('#controllers/v1/notifications_controller'), 'index'])
    router.get('/notifications/unread-count', [() => import('#controllers/v1/notifications_controller'), 'unreadCount'])
    router.put('/notifications/mark-all-read', [() => import('#controllers/v1/notifications_controller'), 'markAllRead'])
    router.put('/notifications/:id/read', [() => import('#controllers/v1/notifications_controller'), 'markRead'])
    router.get('/notifications/preferences', [() => import('#controllers/v1/notifications_controller'), 'getPreferences'])
    router.put('/notifications/preferences', [() => import('#controllers/v1/notifications_controller'), 'updatePreferences'])
  }).use(middleware.auth())

  // ─── Skill 07: Parcels ────────────────────────────────────────────────────────
  router.get('/parcels/track/:code', [() => import('#controllers/v1/parcels_controller'), 'trackByCode'])
  router.group(() => {
    router.get('/parcels', [() => import('#controllers/v1/parcels_controller'), 'index'])
    router.post('/parcels', [() => import('#controllers/v1/parcels_controller'), 'store'])
    router.get('/parcels/:id', [() => import('#controllers/v1/parcels_controller'), 'show'])
    router.put('/parcels/:id', [() => import('#controllers/v1/parcels_controller'), 'update'])
  }).use(middleware.auth())

  // ─── Skill 10: KYC & Security ─────────────────────────────────────────────────
  router.group(() => {
    router.get('/kyc/status', [() => import('#controllers/v1/kyc_documents_controller'), 'userKycStatus'])
    router.get('/kyc-documents', [() => import('#controllers/v1/kyc_documents_controller'), 'index'])
    router.post('/kyc-documents', [() => import('#controllers/v1/kyc_documents_controller'), 'store'])
    router.get('/kyc-documents/:id', [() => import('#controllers/v1/kyc_documents_controller'), 'show'])
    router.put('/kyc-documents/:id/verify', [() => import('#controllers/v1/kyc_documents_controller'), 'verify'])
  }).use(middleware.auth())

  // ─── Skill 12: Marketplace & Advanced Features ────────────────────────────────
  router.get('/reviews', [() => import('#controllers/v1/reviews_controller'), 'index'])
  router.get('/reviews/:id', [() => import('#controllers/v1/reviews_controller'), 'show'])
  router.group(() => {
    router.post('/reviews', [() => import('#controllers/v1/reviews_controller'), 'store'])
  }).use(middleware.auth())

  router.group(() => {
    router.get('/api-keys', [() => import('#controllers/v1/api_keys_controller'), 'index'])
    router.post('/api-keys', [() => import('#controllers/v1/api_keys_controller'), 'store'])
    router.delete('/api-keys/:id', [() => import('#controllers/v1/api_keys_controller'), 'destroy'])
  }).use(middleware.auth())

  // ─── Skill 13: Subscription Billing ──────────────────────────────────────────
  router.group(() => {
    router.get('/subscriptions/current', [() => import('#controllers/v1/subscriptions_controller'), 'show'])
    router.post('/subscriptions/upgrade', [() => import('#controllers/v1/subscriptions_controller'), 'upgrade'])
    router.get('/invoices', [() => import('#controllers/v1/subscriptions_controller'), 'listInvoices'])
  }).use(middleware.auth())

  // ─── Skill 14: Multi-Currency & Exchange Rates ────────────────────────────────
  router.get('/exchange-rates/current', [() => import('#controllers/v1/exchange_rates_controller'), 'current'])
  router.get('/exchange-rates', [() => import('#controllers/v1/exchange_rates_controller'), 'index'])
  router.group(() => {
    router.post('/exchange-rates', [() => import('#controllers/v1/exchange_rates_controller'), 'store'])
    router.put('/exchange-rates/:id', [() => import('#controllers/v1/exchange_rates_controller'), 'update'])
  }).use(middleware.auth())

  // ─── Skill 15: Promotions, Coupons & Loyalty ──────────────────────────────────
  router.post('/coupons/validate', [() => import('#controllers/v1/coupons_controller'), 'validate'])
  router.group(() => {
    router.get('/promotions', [() => import('#controllers/v1/promotions_controller'), 'index'])
    router.post('/promotions', [() => import('#controllers/v1/promotions_controller'), 'store'])
    router.put('/promotions/:id', [() => import('#controllers/v1/promotions_controller'), 'update'])
    router.delete('/promotions/:id', [() => import('#controllers/v1/promotions_controller'), 'destroy'])
    router.get('/coupons', [() => import('#controllers/v1/coupons_controller'), 'index'])
    router.post('/coupons', [() => import('#controllers/v1/coupons_controller'), 'store'])
    router.get('/loyalty/balance', [() => import('#controllers/v1/loyalty_controller'), 'balance'])
    router.get('/loyalty/history', [() => import('#controllers/v1/loyalty_controller'), 'history'])
  }).use(middleware.auth())

}).prefix('/api/v1')
