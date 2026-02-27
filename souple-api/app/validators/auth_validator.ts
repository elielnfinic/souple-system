import vine from '@vinejs/vine'

export const sendOtpValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().optional(),
    email: vine.string().email().trim().optional(),
    purpose: vine.enum(['login', 'register', 'password_reset', 'phone_verify', 'email_verify']),
  })
)

export const verifyOtpValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().optional(),
    email: vine.string().email().trim().optional(),
    code: vine.string().trim().minLength(6).maxLength(6),
    purpose: vine.enum(['login', 'register', 'password_reset', 'phone_verify', 'email_verify']),
  })
)

export const registerValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().minLength(8).maxLength(20),
    email: vine.string().email().trim().optional(),
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    otpCode: vine.string().trim().minLength(6).maxLength(6),
    locale: vine.enum(['fr', 'en', 'ln', 'sw']).optional(),
    // Optional: create an organization on registration
    organization: vine
      .object({
        name: vine.string().trim().minLength(2).maxLength(255),
        type: vine.enum(['agency', 'company', 'independent']),
        city: vine.string().trim().maxLength(100),
        phone: vine.string().trim().maxLength(20),
        email: vine.string().email().trim(),
      })
      .optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().optional(),
    email: vine.string().email().trim().optional(),
    // OTP-based login
    otpCode: vine.string().trim().minLength(6).maxLength(6).optional(),
    // Password-based login (admin accounts)
    password: vine.string().minLength(8).optional(),
  })
)

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().trim(),
  })
)
