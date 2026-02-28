import vine from '@vinejs/vine'

const seatEntrySchema = vine.object({
  id: vine.string().trim(),
  row: vine.number().min(0),
  col: vine.number().min(0),
  type: vine.enum(['seat', 'aisle', 'door', 'driver', 'stairs']),
  class: vine.string().trim().optional(),
  bookable: vine.boolean(),
  label: vine.string().trim().optional(),
  priceMultiplier: vine.number().min(0).optional(),
})

const layoutDataSchema = vine.object({
  seats: vine.array(seatEntrySchema),
})

export const createSeatLayoutValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100),
    rows: vine.number().range([1, 30]),
    columns: vine.number().range([1, 10]),
    layoutData: layoutDataSchema,
    isDefault: vine.boolean().optional(),
  })
)

export const updateSeatLayoutValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100).optional(),
    rows: vine.number().range([1, 30]).optional(),
    columns: vine.number().range([1, 10]).optional(),
    layoutData: layoutDataSchema.optional(),
    isDefault: vine.boolean().optional(),
  })
)
