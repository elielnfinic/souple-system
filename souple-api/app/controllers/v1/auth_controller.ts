import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import Organization from '#models/organization'
import OrganizationMember from '#models/organization_member'
import { OtpService } from '#services/otp_service'
import { EmailService } from '#services/email_service'
import {
  sendOtpValidator,
  verifyOtpValidator,
  sendRegistrationOtpValidator,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '#validators/auth_validator'
import db from '@adonisjs/lucid/services/db'
import string from '@adonisjs/core/helpers/string'

export default class AuthController {
  /**
   * POST /api/v1/auth/send-otp
   * Generates and sends OTP to phone or email.
   */
  async sendOtp({ request, response }: HttpContext) {
    const { phone, email, purpose } = await request.validateUsing(sendOtpValidator)

    const identifier = phone ?? email
    if (!identifier) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Either phone or email is required' },
      })
    }

    const code = OtpService.generate()
    await OtpService.store(identifier, purpose, code)

    if (phone) {
      await OtpService.send(phone, code)
    } else if (email) {
      await OtpService.sendEmail(email, code, purpose as 'login' | 'register' | 'password_reset')
    }

    return response.ok({
      success: true,
      data: {
        message: `OTP sent to ${phone ? 'phone' : 'email'}`,
        expiresInMinutes: 5,
      },
    })
  }

  /**
   * POST /api/v1/auth/verify-otp
   * Verifies an OTP code without creating a session (for step-based flows).
   */
  async verifyOtp({ request, response }: HttpContext) {
    const { phone, email, code, purpose } = await request.validateUsing(verifyOtpValidator)

    const identifier = phone ?? email
    if (!identifier) {
      return response.badRequest({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Either phone or email is required' },
      })
    }

    const valid = await OtpService.verify(identifier, purpose, code)
    if (!valid) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_OTP_INVALID', message: 'Invalid or expired OTP code' },
      })
    }

    return response.ok({
      success: true,
      data: { verified: true },
    })
  }

  /**
   * POST /api/v1/auth/send-registration-otp
   * Validates registration data and sends an OTP to the email.
   * Does NOT create the user yet — that happens in /register after OTP verification.
   */
  async sendRegistrationOtp({ request, response }: HttpContext) {
    const { email, phone, locale } = await request.validateUsing(sendRegistrationOtpValidator)

    // Email uniqueness check (fail fast with clear message)
    const existingEmail = await User.findBy('email', email)
    if (existingEmail) {
      return response.conflict({
        success: false,
        error: { code: 'E_CONFLICT', message: 'A user with this email already exists' },
      })
    }

    // Phone uniqueness check
    if (phone) {
      const existingPhone = await User.findBy('phone', phone)
      if (existingPhone) {
        return response.conflict({
          success: false,
          error: { code: 'E_CONFLICT', message: 'A user with this phone number already exists' },
        })
      }
    }

    const code = OtpService.generate()
    await OtpService.store(email, 'register', code)
    await OtpService.sendEmail(email, code, 'register', locale ?? 'fr')

    return response.ok({
      success: true,
      data: { message: 'OTP sent to email', expiresInMinutes: 5 },
    })
  }

  /**
   * POST /api/v1/auth/register
   * Step 2 of registration: verify OTP then create the user.
   */
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    // Verify email OTP before creating anything
    const valid = await OtpService.verify(data.email, 'register', data.otpCode)
    if (!valid) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_OTP_INVALID', message: 'Invalid or expired verification code' },
      })
    }

    // Email uniqueness check (re-check in case of race)
    const existingEmail = await User.findBy('email', data.email)
    if (existingEmail) {
      return response.conflict({
        success: false,
        error: { code: 'E_CONFLICT', message: 'A user with this email already exists' },
      })
    }

    // Phone uniqueness check (only if provided)
    if (data.phone) {
      const existingPhone = await User.findBy('phone', data.phone)
      if (existingPhone) {
        return response.conflict({
          success: false,
          error: { code: 'E_CONFLICT', message: 'A user with this phone number already exists' },
        })
      }
    }

    const user = await db.transaction(async (trx) => {
      const newUser = await User.create(
        {
          email: data.email,
          phone: data.phone ?? null,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password, // @beforeSave hook hashes it
          locale: data.locale ?? 'fr',
          ...(data.timezone ? { timezone: data.timezone } : {}),
          isActive: true,
        },
        { client: trx }
      )

      // Optionally create organization
      if (data.organization) {
        const org = await Organization.create(
          {
            name: data.organization.name,
            slug: string.slug(data.organization.name),
            type: data.organization.type,
            city: data.organization.city,
            phone: data.organization.phone,
            email: data.organization.email,
            isActive: true,
          },
          { client: trx }
        )

        await OrganizationMember.create(
          {
            organizationId: org.id,
            userId: newUser.id,
            role: 'owner',
            isActive: true,
            joinedAt: DateTime.utc(),
          },
          { client: trx }
        )
      }

      return newUser
    })

    const token = await User.accessTokens.create(user, ['*'], {
      name: 'auth_token',
    })

    // Load memberships so the frontend can set activeOrg immediately
    await user.load('memberships', (q) => q.where('is_active', true).preload('organization'))

    // Send welcome email (non-blocking — don't delay the response)
    EmailService.sendWelcome(user.email!, user.firstName, user.locale ?? 'fr').catch((err) => {
      console.error('[EmailService] Failed to send welcome email:', err.message)
    })

    return response.created({
      success: true,
      data: {
        user: user.serialize(),
        token: {
          type: 'bearer',
          token: token.value!.release(),
          expiresAt: token.expiresAt,
        },
      },
    })
  }

  /**
   * POST /api/v1/auth/login
   * Three auth branches:
   *   1. email/phone + password  → verifyCredentials
   *   2. email/phone + otpCode   → OTP verification
   *   3. Neither present         → 422
   */
  async login({ request, response }: HttpContext) {
    const data = await request.validateUsing(loginValidator)

    const identifier = data.email ?? data.phone

    if (!identifier) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Either email or phone is required' },
      })
    }

    if (!data.password && !data.otpCode) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_VALIDATION', message: 'Either password or OTP code is required' },
      })
    }

    let user: User | null = null

    // Branch 1: password-based login
    if (data.password) {
      try {
        user = await User.verifyCredentials(identifier, data.password)
      } catch {
        user = null
      }
    }

    // Branch 2: OTP-based login
    if (!user && data.otpCode) {
      const valid = await OtpService.verify(identifier, 'login', data.otpCode)
      if (!valid) {
        return response.unprocessableEntity({
          success: false,
          error: { code: 'E_OTP_INVALID', message: 'Invalid or expired OTP code' },
        })
      }
      // Find by email first, then phone
      user = data.email
        ? await User.findBy('email', data.email)
        : await User.findBy('phone', data.phone!)
    }

    if (!user || !user.isActive) {
      return response.unauthorized({
        success: false,
        error: { code: 'E_UNAUTHORIZED', message: 'Invalid credentials' },
      })
    }

    const token = await User.accessTokens.create(user, ['*'], {
      name: 'auth_token',
    })

    // Load memberships so the frontend can set activeOrg immediately (no second round-trip needed)
    await user.load('memberships', (q) => q.where('is_active', true).preload('organization'))

    return response.ok({
      success: true,
      data: {
        user: user.serialize(),
        token: {
          type: 'bearer',
          token: token.value!.release(),
          expiresAt: token.expiresAt,
        },
      },
    })
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Sends a password-reset OTP to the user's email.
   * Always returns 200 to avoid leaking account existence.
   */
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    const user = await User.findBy('email', email)

    if (user) {
      const code = OtpService.generate()
      await OtpService.store(email, 'password_reset', code)
      await OtpService.sendEmail(email, code, 'password_reset', user.locale ?? 'fr')
    }

    return response.ok({
      success: true,
      data: {
        message: 'If an account with this email exists, a reset code has been sent.',
        expiresInMinutes: 5,
      },
    })
  }

  /**
   * POST /api/v1/auth/reset-password
   * Verifies the OTP and sets a new password.
   */
  async resetPassword({ request, response }: HttpContext) {
    const { email, otpCode, newPassword } = await request.validateUsing(resetPasswordValidator)

    const user = await User.findBy('email', email)
    if (!user) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_OTP_INVALID', message: 'Invalid or expired reset code' },
      })
    }

    const valid = await OtpService.verify(email, 'password_reset', otpCode)
    if (!valid) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_OTP_INVALID', message: 'Invalid or expired reset code' },
      })
    }

    user.password = newPassword // @beforeSave hook hashes it
    await user.save()

    return response.ok({
      success: true,
      data: { message: 'Password updated successfully' },
    })
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes the current access token.
   */
  async logout({ auth, response }: HttpContext) {
    const user = auth.user!
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)

    return response.ok({
      success: true,
      data: { message: 'Logged out successfully' },
    })
  }

  /**
   * GET /api/v1/me
   * Returns the current user's profile.
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.user!
    await user.load('memberships', (q) => q.where('is_active', true).preload('organization'))

    return response.ok({
      success: true,
      data: {
        ...user.serialize(),
        memberships: user.memberships.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
          organization: m.organization,
        })),
      },
    })
  }

  /**
   * PUT /api/v1/me
   * Updates the current user's profile.
   */
  async updateMe({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = request.only(['firstName', 'lastName', 'locale', 'timezone', 'avatarUrl'])

    user.merge(data)
    await user.save()

    return response.ok({
      success: true,
      data: user.serialize(),
    })
  }
}
