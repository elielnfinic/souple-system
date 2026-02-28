import vine from '@vinejs/vine'

const SEAT_TYPES = ['driver', 'seat', 'aisle', 'door', 'luggage', 'empty'] as const
const SEAT_CLASS_SLUGS = ['vip', 'economy', 'business'] as const

const seatDefinitionSchema = vine.object({
  id: vine.string().trim().minLength(1).maxLength(50),
  row: vine.number().min(0).max(29),
  col: vine.number().min(0).max(9),
  type: vine.enum(SEAT_TYPES),
  class: vine.enum(SEAT_CLASS_SLUGS).nullable().optional(),
  bookable: vine.boolean(),
  label: vine.string().trim().maxLength(20).nullable().optional(),
  priceMultiplier: vine.number().min(0).max(10).optional(),
  features: vine.array(vine.string().trim().maxLength(50)).optional(),
})

const layoutDataSchema = vine.object({
  seats: vine.array(seatDefinitionSchema),
})

export const createSeatLayoutValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    rows: vine.number().min(1).max(30),
    columns: vine.number().min(1).max(10),
    layoutData: layoutDataSchema,
    isDefault: vine.boolean().optional(),
  })
)

export const updateSeatLayoutValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    rows: vine.number().min(1).max(30).optional(),
    columns: vine.number().min(1).max(10).optional(),
    layoutData: layoutDataSchema.optional(),
    isDefault: vine.boolean().optional(),
  })
)
