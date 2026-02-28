import vine from '@vinejs/vine'

const PAYMENT_METHODS = ['mobile_money', 'card', 'stripe', 'stablecoin', 'cash'] as const
const CURRENCIES = ['CDF', 'USD'] as const

/**
 * Initiate a payment for a trip booking.
 * Either booking_id or fleet_booking_id must be provided (validated in controller).
 */
export const initiatePaymentValidator = vine.compile(
  vine.object({
    bookingId: vine.number().positive().optional(),
    fleetBookingId: vine.number().positive().optional(),
    amount: vine.number().positive(),
    currency: vine.enum(CURRENCIES),
    method: vine.enum(PAYMENT_METHODS),
    provider: vine.string().trim().minLength(2).maxLength(50),
    customerPhone: vine.string().trim().minLength(5).maxLength(20).optional(),
    customerEmail: vine.string().trim().email().maxLength(255).optional(),
  })
)

/**
 * Record a cash payment (ticketer flow).
 * Cash payments require either bookingId or fleetBookingId.
 */
export const cashPaymentValidator = vine.compile(
  vine.object({
    bookingId: vine.number().positive().optional(),
    fleetBookingId: vine.number().positive().optional(),
    amount: vine.number().positive(),
    currency: vine.enum(CURRENCIES),
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)

/**
 * Initiate a refund. Amount is optional — defaults to full refund.
 */
export const refundValidator = vine.compile(
  vine.object({
    amount: vine.number().positive().optional(),
  })
)

/**
 * Create a payout record for a driver or agency owner.
 */
export const payoutValidator = vine.compile(
  vine.object({
    userId: vine.number().positive(),
    amount: vine.number().positive(),
    currency: vine.enum(CURRENCIES),
    method: vine.string().trim().minLength(2).maxLength(50),
    provider: vine.string().trim().minLength(2).maxLength(50),
    phoneNumber: vine.string().trim().minLength(5).maxLength(20).optional(),
    periodStart: vine.string().trim(), // ISO date string YYYY-MM-DD
    periodEnd: vine.string().trim(),   // ISO date string YYYY-MM-DD
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)
