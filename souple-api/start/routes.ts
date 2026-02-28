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
    router.post('/send-otp',               [() => import('#controllers/v1/auth_controller'), 'sendOtp'])
    router.post('/verify-otp',             [() => import('#controllers/v1/auth_controller'), 'verifyOtp'])
    router.post('/send-registration-otp',  [() => import('#controllers/v1/auth_controller'), 'sendRegistrationOtp'])
    router.post('/register',               [() => import('#controllers/v1/auth_controller'), 'register'])
    router.post('/login',          [() => import('#controllers/v1/auth_controller'), 'login'])
    router.post('/forgot-password',[() => import('#controllers/v1/auth_controller'), 'forgotPassword'])
    router.post('/reset-password', [() => import('#controllers/v1/auth_controller'), 'resetPassword'])
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

  // ─── Seat Classes (public read, super_admin write) ────────────────────────
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/seat_classes_controller'), 'index'])
  }).prefix('/seat-classes')

  router.group(() => {
    router.post('/',      [() => import('#controllers/v1/seat_classes_controller'), 'store'])
    router.put('/:id',    [() => import('#controllers/v1/seat_classes_controller'), 'update'])
    router.delete('/:id', [() => import('#controllers/v1/seat_classes_controller'), 'destroy'])
  }).prefix('/seat-classes').use(middleware.auth())

  // ─── Vehicles ─────────────────────────────────────────────────────────────
  // Public listing (verified & public vehicles)
  router.get('/vehicles', [() => import('#controllers/v1/vehicles_controller'), 'index'])

  // Authenticated vehicle management
  router.group(() => {
    router.post('/',                         [() => import('#controllers/v1/vehicles_controller'), 'store'])
    router.get('/:id',                       [() => import('#controllers/v1/vehicles_controller'), 'show'])
    router.put('/:id',                       [() => import('#controllers/v1/vehicles_controller'), 'update'])
    router.delete('/:id',                    [() => import('#controllers/v1/vehicles_controller'), 'destroy'])
    router.put('/:id/verify',                [() => import('#controllers/v1/vehicles_controller'), 'verify'])
    router.get('/:id/availability',          [() => import('#controllers/v1/vehicles_controller'), 'availability'])
    router.post('/:id/photos',               [() => import('#controllers/v1/vehicles_controller'), 'uploadPhoto'])
    router.delete('/:id/photos/:key',        [() => import('#controllers/v1/vehicles_controller'), 'deletePhoto'])

    // Seat layouts nested under vehicles
    router.group(() => {
      router.get('/',                        [() => import('#controllers/v1/seat_layouts_controller'), 'index'])
      router.post('/',                       [() => import('#controllers/v1/seat_layouts_controller'), 'store'])
      router.get('/:id',                     [() => import('#controllers/v1/seat_layouts_controller'), 'show'])
      router.put('/:id',                     [() => import('#controllers/v1/seat_layouts_controller'), 'update'])
      router.delete('/:id',                  [() => import('#controllers/v1/seat_layouts_controller'), 'destroy'])
      router.put('/:id/default',             [() => import('#controllers/v1/seat_layouts_controller'), 'setDefault'])
    }).prefix('/:vehicleId/seat-layouts')
  }).prefix('/vehicles').use([middleware.auth(), middleware.tenant()])


  // ─── Price Rules (auth write, public calculate) ───────────────────────────
  router.group(() => {
    // Public: calculate price for a segment and get price matrix
    router.get('/calculate', [() => import('#controllers/v1/price_rules_controller'), 'calculate'])
    router.get('/matrix/:routeId', [() => import('#controllers/v1/price_rules_controller'), 'matrix'])

    // Protected: CRUD for price rules
    router.group(() => {
      router.get('/', [() => import('#controllers/v1/price_rules_controller'), 'index'])
      router.post('/', [() => import('#controllers/v1/price_rules_controller'), 'store'])
      router.put('/:id', [() => import('#controllers/v1/price_rules_controller'), 'update'])
      router.delete('/:id', [() => import('#controllers/v1/price_rules_controller'), 'destroy'])
    }).use([middleware.auth(), middleware.tenant()])
  }).prefix('/price-rules')

  // ─── Trips ────────────────────────────────────────────────────────────────
  // Public: search
  router.get('/trips/search', [() => import('#controllers/v1/trips_controller'), 'search'])

  // Public: read trips
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/trips_controller'), 'index'])
    router.get('/:id', [() => import('#controllers/v1/trips_controller'), 'show'])
    router.get('/:id/stops', [() => import('#controllers/v1/trips_controller'), 'stops'])
    router.get('/:id/seats', [() => import('#controllers/v1/trips_controller'), 'seats'])
  }).prefix('/trips')

  // Protected: manage trips
  router.group(() => {
    router.post('/', [() => import('#controllers/v1/trips_controller'), 'store'])
    router.put('/:id', [() => import('#controllers/v1/trips_controller'), 'update'])
    router.delete('/:id', [() => import('#controllers/v1/trips_controller'), 'destroy'])

    // Status transitions
    router.post('/:id/start', [() => import('#controllers/v1/trips_controller'), 'start'])
    router.post('/:id/complete', [() => import('#controllers/v1/trips_controller'), 'complete'])

    // Stop management
    router.put('/:id/stops/:stopId', [() => import('#controllers/v1/trips_controller'), 'updateStop'])
    router.post('/:id/stops/:stopId/arrive', [() => import('#controllers/v1/trips_controller'), 'arriveAtStop'])
    router.post('/:id/stops/:stopId/depart', [() => import('#controllers/v1/trips_controller'), 'departFromStop'])

    // Manifest
    router.get('/:id/manifest', [() => import('#controllers/v1/trips_controller'), 'manifest'])

    // Seat reservations (nested under trips)
    router.post('/:tripId/seats/reserve', [() => import('#controllers/v1/bookings_controller'), 'reserveSeats'])
    router.delete('/:tripId/seats/reserve/:id', [() => import('#controllers/v1/bookings_controller'), 'releaseReservation'])
  }).prefix('/trips').use([middleware.auth(), middleware.tenant()])

  // ─── Bookings ─────────────────────────────────────────────────────────────
  // Public: track by code (no auth required)
  router.get('/bookings/track/:code', [() => import('#controllers/v1/bookings_controller'), 'track'])

  // Protected: booking operations
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/bookings_controller'), 'index'])
    router.post('/', [() => import('#controllers/v1/bookings_controller'), 'store'])
    router.get('/:id', [() => import('#controllers/v1/bookings_controller'), 'show'])
    router.post('/:id/cancel', [() => import('#controllers/v1/bookings_controller'), 'cancel'])
    router.post('/:id/check-in', [() => import('#controllers/v1/bookings_controller'), 'checkIn'])
    router.post('/:id/check-out', [() => import('#controllers/v1/bookings_controller'), 'checkOut'])
    router.get('/:id/ticket', [() => import('#controllers/v1/bookings_controller'), 'ticket'])
    router.post('/sync', [() => import('#controllers/v1/bookings_controller'), 'sync'])
  }).prefix('/bookings').use(middleware.auth())

  // ─── Fleet Bookings ───────────────────────────────────────────────────────
  router.group(() => {
    router.get('/', [() => import('#controllers/v1/fleet_bookings_controller'), 'index'])
    router.post('/', [() => import('#controllers/v1/fleet_bookings_controller'), 'store'])
    router.get('/:id', [() => import('#controllers/v1/fleet_bookings_controller'), 'show'])
    router.put('/:id', [() => import('#controllers/v1/fleet_bookings_controller'), 'update'])
    router.post('/:id/cancel', [() => import('#controllers/v1/fleet_bookings_controller'), 'cancel'])
    router.post('/:id/confirm', [() => import('#controllers/v1/fleet_bookings_controller'), 'confirm'])
  }).prefix('/fleet-bookings').use(middleware.auth())

  // ─── Payments ─────────────────────────────────────────────────────────────

  // Webhooks — PUBLIC (no auth, signature-verified inside handler)
  router.group(() => {
    router.post('/mtn',      [() => import('#controllers/v1/payments_controller'), 'webhookMtn'])
    router.post('/orange',   [() => import('#controllers/v1/payments_controller'), 'webhookOrange'])
    router.post('/airtel',   [() => import('#controllers/v1/payments_controller'), 'webhookAirtel'])
    router.post('/stripe',   [() => import('#controllers/v1/payments_controller'), 'webhookStripe'])
    router.post('/coinbase', [() => import('#controllers/v1/payments_controller'), 'webhookCoinbase'])
  }).prefix('/payments/webhooks')

  // Payment operations — Auth required
  router.group(() => {
    router.get('/',                    [() => import('#controllers/v1/payments_controller'), 'index'])
    router.post('/initiate',           [() => import('#controllers/v1/payments_controller'), 'initiate'])
    router.post('/fleet/initiate',     [() => import('#controllers/v1/payments_controller'), 'initiateFleet'])
    router.post('/cash',               [() => import('#controllers/v1/payments_controller'), 'cash'])
    router.get('/:id',                 [() => import('#controllers/v1/payments_controller'), 'show'])
    router.get('/:id/status',          [() => import('#controllers/v1/payments_controller'), 'status'])
    router.post('/:id/refund',         [() => import('#controllers/v1/payments_controller'), 'refund'])
    router.get('/:id/receipt',         [() => import('#controllers/v1/payments_controller'), 'receipt'])
  }).prefix('/payments').use(middleware.auth())

  // Payouts — Auth required
  router.group(() => {
    router.get('/',    [() => import('#controllers/v1/payments_controller'), 'listPayouts'])
    router.post('/',   [() => import('#controllers/v1/payments_controller'), 'createPayout'])
    router.get('/:id', [() => import('#controllers/v1/payments_controller'), 'showPayout'])
  }).prefix('/payouts').use(middleware.auth())

  // ─── Notifications ────────────────────────────────────────────────────────

  // Telegram webhook — PUBLIC (Telegram calls this, no user auth)
  router.post(
    '/notifications/telegram/webhook',
    [() => import('#controllers/v1/notifications_controller'), 'telegramWebhook']
  )

  // Auth-protected notification endpoints
  router.group(() => {
    // Notification list & management
    router.get('/',                      [() => import('#controllers/v1/notifications_controller'), 'index'])
    router.get('/unread-count',          [() => import('#controllers/v1/notifications_controller'), 'unreadCount'])
    router.put('/:id/read',              [() => import('#controllers/v1/notifications_controller'), 'markRead'])
    router.put('/read-all',              [() => import('#controllers/v1/notifications_controller'), 'markAllRead'])
    router.delete('/:id',                [() => import('#controllers/v1/notifications_controller'), 'destroy'])

    // Preferences
    router.get('/preferences',           [() => import('#controllers/v1/notifications_controller'), 'getPreferences'])
    router.put('/preferences',           [() => import('#controllers/v1/notifications_controller'), 'updatePreferences'])

    // Telegram account linking
    router.post('/telegram/link',        [() => import('#controllers/v1/notifications_controller'), 'telegramLink'])
    router.delete('/telegram/unlink',    [() => import('#controllers/v1/notifications_controller'), 'telegramUnlink'])

    // Web Push subscriptions
    router.post('/push/subscribe',       [() => import('#controllers/v1/notifications_controller'), 'pushSubscribe'])
    router.delete('/push/unsubscribe',   [() => import('#controllers/v1/notifications_controller'), 'pushUnsubscribe'])

    // Admin: send / broadcast
    router.post('/send',                 [() => import('#controllers/v1/notifications_controller'), 'send'])
    router.post('/broadcast',            [() => import('#controllers/v1/notifications_controller'), 'broadcast'])
  }).prefix('/notifications').use(middleware.auth())

  // ─── USSD (public callback) ──────────────────────────────────────────────
  router.post('/ussd/callback', [() => import('#controllers/v1/ussd_controller'), 'callback'])

  // ─── SMS (public callbacks) ──────────────────────────────────────────────
  router.post('/sms/inbound', [() => import('#controllers/v1/sms_controller'), 'inbound'])
  router.post('/sms/delivery-report', [() => import('#controllers/v1/sms_controller'), 'deliveryReport'])

  // ─── WhatsApp (public webhook) ───────────────────────────────────────────
  router.get('/whatsapp/webhook', [() => import('#controllers/v1/whatsapp_controller'), 'verify'])
  router.post('/whatsapp/webhook', [() => import('#controllers/v1/whatsapp_controller'), 'webhook'])

  // ─── Conversations (auth) ────────────────────────────────────────────────
  router.group(() => {
    router.get('/unread-count', [() => import('#controllers/v1/conversations_controller'), 'unreadCount'])
    router.get('/', [() => import('#controllers/v1/conversations_controller'), 'index'])
    router.post('/', [() => import('#controllers/v1/conversations_controller'), 'store'])
    router.get('/:id', [() => import('#controllers/v1/conversations_controller'), 'show'])
    router.post('/:id/messages', [() => import('#controllers/v1/conversations_controller'), 'sendMessage'])
    router.put('/:id/read', [() => import('#controllers/v1/conversations_controller'), 'markRead'])
    router.put('/:id/archive', [() => import('#controllers/v1/conversations_controller'), 'archive'])
  }).prefix('/conversations').use(middleware.auth())

  // ─── Canned responses (auth) ─────────────────────────────────────────────
  router.group(() => {
    router.get('/canned-responses', [() => import('#controllers/v1/canned_responses_controller'), 'index'])
    router.post('/canned-responses', [() => import('#controllers/v1/canned_responses_controller'), 'store'])
    router.put('/canned-responses/:id', [() => import('#controllers/v1/canned_responses_controller'), 'update'])
    router.delete('/canned-responses/:id', [() => import('#controllers/v1/canned_responses_controller'), 'destroy'])
  }).prefix('/org').use([middleware.auth(), middleware.tenant()])

}).prefix('/api/v1')
