import vine from '@vinejs/vine'

const TRIP_STATUSES = ['scheduled', 'boarding', 'in_progress', 'completed', 'cancelled'] as const
const PRICE_MODES = ['fixed', 'per_segment', 'per_km'] as const
const CURRENCIES = ['CDF', 'USD'] as const

export const createTripValidator = vine.compile(
  vine.object({
    vehicleId: vine.number().positive(),
    driverUserId: vine.number().positive(),
    routeId: vine.number().positive(),
    seatLayoutId: vine.number().positive(),
    departureAt: vine.string().trim(),
    estimatedArrivalAt: vine.string().trim().optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    allowIntermediateBoarding: vine.boolean().optional(),
    isRecurring: vine.boolean().optional(),
    recurrenceRule: vine.string().trim().maxLength(255).optional(),
  })
)

export const updateTripValidator = vine.compile(
  vine.object({
    vehicleId: vine.number().positive().optional(),
    driverUserId: vine.number().positive().optional(),
    routeId: vine.number().positive().optional(),
    seatLayoutId: vine.number().positive().optional(),
    departureAt: vine.string().trim().optional(),
    estimatedArrivalAt: vine.string().trim().optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    allowIntermediateBoarding: vine.boolean().optional(),
    isRecurring: vine.boolean().optional(),
    recurrenceRule: vine.string().trim().maxLength(255).optional(),
  })
)

export const tripStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(TRIP_STATUSES),
  })
)

export const updateTripStopValidator = vine.compile(
  vine.object({
    stopName: vine.string().trim().maxLength(200).optional(),
    scheduledArrivalAt: vine.string().trim().optional(),
    scheduledDepartureAt: vine.string().trim().optional(),
    actualArrivalAt: vine.string().trim().optional(),
    actualDepartureAt: vine.string().trim().optional(),
    boardingEnabled: vine.boolean().optional(),
    alightingEnabled: vine.boolean().optional(),
  })
)

export const priceRuleValidator = vine.compile(
  vine.object({
    routeId: vine.number().positive(),
    fromStopOrder: vine.number().min(0).optional(),
    toStopOrder: vine.number().min(0).optional(),
    seatClassId: vine.number().positive().optional(),
    vehicleId: vine.number().positive().optional(),
    basePrice: vine.number().positive(),
    currency: vine.enum(CURRENCIES).optional(),
    priceMode: vine.enum(PRICE_MODES).optional(),
    perSegmentPrice: vine.number().positive().optional(),
    perKmPrice: vine.number().positive().optional(),
    effectiveFrom: vine.date({ formats: ['YYYY-MM-DD'] }),
    effectiveUntil: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    isPeak: vine.boolean().optional(),
    peakMultiplier: vine.number().positive().min(1).max(10).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const updatePriceRuleValidator = vine.compile(
  vine.object({
    fromStopOrder: vine.number().min(0).optional(),
    toStopOrder: vine.number().min(0).optional(),
    seatClassId: vine.number().positive().optional(),
    vehicleId: vine.number().positive().optional(),
    basePrice: vine.number().positive().optional(),
    currency: vine.enum(CURRENCIES).optional(),
    priceMode: vine.enum(PRICE_MODES).optional(),
    perSegmentPrice: vine.number().positive().optional(),
    perKmPrice: vine.number().positive().optional(),
    effectiveFrom: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    effectiveUntil: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    isPeak: vine.boolean().optional(),
    peakMultiplier: vine.number().positive().min(1).max(10).optional(),
    isActive: vine.boolean().optional(),
  })
)
