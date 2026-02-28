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

// Pre-registration: validate data + send OTP (no user created yet)
export const sendRegistrationOtpValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    phone: vine.string().trim().maxLength(20).optional(),
    password: vine.string().minLength(8),
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    locale: vine.enum(['fr', 'en', 'ln', 'sw']).optional(),
  })
)

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    phone: vine.string().trim().maxLength(20).optional(),
    password: vine.string().minLength(8),
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    otpCode: vine.string().trim().regex(/^\d{6}$/),
    locale: vine.enum(['fr', 'en', 'ln', 'sw']).optional(),
    timezone: vine.string().trim().maxLength(100).optional(),
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
    email: vine.string().email().trim().optional(),
    phone: vine.string().trim().optional(),
    password: vine.string().optional(),
    otpCode: vine.string().trim().minLength(6).maxLength(6).optional(),
  })
)

export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    otpCode: vine.string().trim().regex(/^\d{6}$/),
    newPassword: vine.string().minLength(8),
  })
)

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().trim(),
  })
)
