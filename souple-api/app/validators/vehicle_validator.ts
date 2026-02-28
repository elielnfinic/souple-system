import vine from '@vinejs/vine'

const VEHICLE_TYPES = ['minibus', 'bus', 'sedan', 'van', 'pickup', 'truck', 'motorcycle'] as const
const VISIBILITY_VALUES = ['public', 'private'] as const
const VERIFICATION_STATUSES = ['verified', 'rejected'] as const

export const createVehicleValidator = vine.compile(
  vine.object({
    type: vine.enum(VEHICLE_TYPES),
    brand: vine.string().trim().minLength(1).maxLength(50),
    model: vine.string().trim().minLength(1).maxLength(50),
    year: vine.number().positive().min(1900).max(2100).optional(),
    color: vine.string().trim().minLength(1).maxLength(30),
    plateNumber: vine.string().trim().minLength(1).maxLength(20),
    chassisNumber: vine.string().trim().minLength(1).maxLength(50).optional(),
    totalSeats: vine.number().positive().min(1).max(300),
    visibility: vine.enum(VISIBILITY_VALUES).optional(),
    isAvailableForRental: vine.boolean().optional(),
    features: vine.array(vine.string().trim().maxLength(50)).optional(),
    insuranceExpiry: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    technicalVisitExpiry: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  })
)

export const updateVehicleValidator = vine.compile(
  vine.object({
    type: vine.enum(VEHICLE_TYPES).optional(),
    brand: vine.string().trim().minLength(1).maxLength(50).optional(),
    model: vine.string().trim().minLength(1).maxLength(50).optional(),
    year: vine.number().positive().min(1900).max(2100).optional(),
    color: vine.string().trim().minLength(1).maxLength(30).optional(),
    plateNumber: vine.string().trim().minLength(1).maxLength(20).optional(),
    chassisNumber: vine.string().trim().minLength(1).maxLength(50).optional(),
    totalSeats: vine.number().positive().min(1).max(300).optional(),
    visibility: vine.enum(VISIBILITY_VALUES).optional(),
    isAvailableForRental: vine.boolean().optional(),
    features: vine.array(vine.string().trim().maxLength(50)).optional(),
    insuranceExpiry: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    technicalVisitExpiry: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  })
)

export const verifyVehicleValidator = vine.compile(
  vine.object({
    status: vine.enum(VERIFICATION_STATUSES),
    notes: vine.string().trim().maxLength(500).optional(),
  })
)

export const createSeatClassValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(50),
    slug: vine.string().trim().minLength(1).maxLength(50),
    description: vine.string().trim().maxLength(500).optional(),
    defaultMultiplier: vine.number().positive().min(0.1).max(10).optional(),
    color: vine.string().trim().maxLength(7).optional(),
    icon: vine.string().trim().maxLength(50).optional(),
  })
)

export const updateSeatClassValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(50).optional(),
    description: vine.string().trim().maxLength(500).optional(),
    defaultMultiplier: vine.number().positive().min(0.1).max(10).optional(),
    color: vine.string().trim().maxLength(7).optional(),
    icon: vine.string().trim().maxLength(50).optional(),
  })
)
