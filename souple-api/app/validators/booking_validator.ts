import vine from '@vinejs/vine'

export const createBookingValidator = vine.compile(
  vine.object({
    tripId: vine.number().positive(),
    boardingStopId: vine.number().positive(),
    alightingStopId: vine.number().positive(),
    seatIds: vine.array(vine.string().trim().maxLength(10)).minLength(1),
    passengerName: vine.string().trim().maxLength(100),
    passengerPhone: vine.string().trim().maxLength(20).optional(),
    currency: vine.enum(['CDF', 'USD']).optional(),
  })
)
