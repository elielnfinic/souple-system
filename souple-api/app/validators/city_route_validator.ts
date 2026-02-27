import vine from '@vinejs/vine'

export const createCityValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    province: vine.string().trim().minLength(1).maxLength(100),
    country: vine.string().trim().maxLength(50).optional(),
    latitude: vine.number().range([-90, 90]).optional(),
    longitude: vine.number().range([-180, 180]).optional(),
    timezone: vine.string().trim().maxLength(50).optional(),
  })
)

export const updateCityValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    province: vine.string().trim().minLength(1).maxLength(100).optional(),
    latitude: vine.number().range([-90, 90]).optional(),
    longitude: vine.number().range([-180, 180]).optional(),
    timezone: vine.string().trim().maxLength(50).optional(),
    isActive: vine.boolean().optional(),
  })
)

export const createRouteValidator = vine.compile(
  vine.object({
    fromCityId: vine.number().positive(),
    toCityId: vine.number().positive(),
    distanceKm: vine.number().positive().optional(),
    estimatedDurationMin: vine.number().positive().optional(),
  })
)

export const updateRouteValidator = vine.compile(
  vine.object({
    distanceKm: vine.number().positive().optional(),
    estimatedDurationMin: vine.number().positive().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const addStopValidator = vine.compile(
  vine.object({
    cityId: vine.number().positive(),
    stopOrder: vine.number().positive(),
    distanceFromStartKm: vine.number().min(0).optional(),
  })
)

export const updateStopValidator = vine.compile(
  vine.object({
    stopOrder: vine.number().positive().optional(),
    distanceFromStartKm: vine.number().min(0).optional(),
  })
)
