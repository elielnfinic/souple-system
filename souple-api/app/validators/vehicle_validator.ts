import vine from '@vinejs/vine'

export const createVehicleValidator = vine.compile(
  vine.object({
    type: vine.enum(['minibus', 'bus', 'sedan', 'van', 'pickup']),
    brand: vine.string().trim().maxLength(50),
    model: vine.string().trim().maxLength(50),
    year: vine.number().range([1990, 2030]).optional(),
    color: vine.string().trim().maxLength(30),
    plateNumber: vine.string().trim().maxLength(20),
    totalSeats: vine.number().range([1, 100]),
    visibility: vine.enum(['public', 'private']).optional(),
    isAvailableForRental: vine.boolean().optional(),
    features: vine.array(vine.string().trim()).optional(),
  })
)

export const updateVehicleValidator = vine.compile(
  vine.object({
    type: vine.enum(['minibus', 'bus', 'sedan', 'van', 'pickup']).optional(),
    brand: vine.string().trim().maxLength(50).optional(),
    model: vine.string().trim().maxLength(50).optional(),
    year: vine.number().range([1990, 2030]).optional(),
    color: vine.string().trim().maxLength(30).optional(),
    plateNumber: vine.string().trim().maxLength(20).optional(),
    totalSeats: vine.number().range([1, 100]).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    isAvailableForRental: vine.boolean().optional(),
    features: vine.array(vine.string().trim()).optional(),
  })
)

export const verifyVehicleValidator = vine.compile(
  vine.object({
    status: vine.enum(['verified', 'rejected']),
    notes: vine.string().trim().optional(),
  })
)
