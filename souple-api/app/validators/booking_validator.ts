import vine from '@vinejs/vine'

const BOOKING_SOURCES = ['web', 'pos', 'ussd', 'whatsapp', 'agent', 'api', 'corporate'] as const
const BOOKING_TYPES = ['individual', 'group'] as const
const FLEET_BOOKING_TYPES = ['event', 'moving', 'day_rental', 'pickup', 'custom'] as const
const CURRENCIES = ['CDF', 'USD'] as const

export const createBookingValidator = vine.compile(
  vine.object({
    tripId: vine.number().positive(),
    boardingStopId: vine.number().positive(),
    alightingStopId: vine.number().positive(),
    seatIds: vine.array(vine.number().positive()).minLength(1),
    passengerName: vine.string().trim().minLength(1).maxLength(200),
    passengerPhone: vine.string().trim().minLength(5).maxLength(20),
    passengerEmail: vine.string().trim().email().maxLength(255).optional(),
    source: vine.enum(BOOKING_SOURCES).optional(),
    type: vine.enum(BOOKING_TYPES).optional(),
  })
)

export const cancelBookingValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(1).maxLength(1000),
  })
)

export const reserveSeatValidator = vine.compile(
  vine.object({
    seatIds: vine.array(vine.number().positive()).minLength(1),
    boardingStopOrder: vine.number().min(0),
    alightingStopOrder: vine.number().min(1),
  })
)

export const syncOfflineValidator = vine.compile(
  vine.object({
    bookings: vine.array(
      vine.object({
        offlineId: vine.string().trim().minLength(1).maxLength(36),
        tripId: vine.number().positive(),
        boardingStopId: vine.number().positive(),
        alightingStopId: vine.number().positive(),
        seatIds: vine.array(vine.number().positive()).minLength(1),
        passengerName: vine.string().trim().minLength(1).maxLength(200),
        passengerPhone: vine.string().trim().minLength(5).maxLength(20),
        passengerEmail: vine.string().trim().email().maxLength(255).optional(),
        source: vine.enum(BOOKING_SOURCES).optional(),
        type: vine.enum(BOOKING_TYPES).optional(),
        createdAtLocal: vine.string().trim().optional(),
      })
    ).minLength(1),
  })
)

export const fleetBookingValidator = vine.compile(
  vine.object({
    vehicleId: vine.number().positive(),
    type: vine.enum(FLEET_BOOKING_TYPES),
    title: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(2000).optional(),
    startAt: vine.string().trim(),
    endAt: vine.string().trim(),
    pickupLocation: vine.string().trim().minLength(1).maxLength(500),
    pickupLatitude: vine.number().min(-90).max(90).optional(),
    pickupLongitude: vine.number().min(-180).max(180).optional(),
    dropoffLocation: vine.string().trim().maxLength(500).optional(),
    dropoffLatitude: vine.number().min(-90).max(90).optional(),
    dropoffLongitude: vine.number().min(-180).max(180).optional(),
    totalAmount: vine.number().positive(),
    currency: vine.enum(CURRENCIES).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    driverUserId: vine.number().positive().optional(),
  })
)

export const updateFleetBookingValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().maxLength(2000).optional(),
    startAt: vine.string().trim().optional(),
    endAt: vine.string().trim().optional(),
    pickupLocation: vine.string().trim().maxLength(500).optional(),
    pickupLatitude: vine.number().min(-90).max(90).optional(),
    pickupLongitude: vine.number().min(-180).max(180).optional(),
    dropoffLocation: vine.string().trim().maxLength(500).optional(),
    dropoffLatitude: vine.number().min(-90).max(90).optional(),
    dropoffLongitude: vine.number().min(-180).max(180).optional(),
    totalAmount: vine.number().positive().optional(),
    currency: vine.enum(CURRENCIES).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    driverUserId: vine.number().positive().optional(),
  })
)
