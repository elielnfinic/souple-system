import vine from '@vinejs/vine'

export const createTripValidator = vine.compile(
  vine.object({
    vehicleId: vine.number().positive(),
    routeId: vine.number().positive(),
    departureAt: vine.string().trim(),
    basePriceCdf: vine.number().min(0),
    basePriceUsd: vine.number().min(0).optional(),
    driverUserId: vine.number().positive().optional(),
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

export const updateTripValidator = vine.compile(
  vine.object({
    driverUserId: vine.number().positive().optional(),
    departureAt: vine.string().trim().optional(),
    basePriceCdf: vine.number().min(0).optional(),
    basePriceUsd: vine.number().min(0).optional(),
    status: vine.enum(['scheduled', 'boarding', 'departed', 'completed', 'cancelled']).optional(),
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

export const searchTripValidator = vine.compile(
  vine.object({
    fromCityId: vine.number().positive(),
    toCityId: vine.number().positive(),
    departureDate: vine.string().trim(),
    passengers: vine.number().min(1).max(50).optional(),
    page: vine.number().min(1).optional(),
  })
)
