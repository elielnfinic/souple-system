import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import Organization from '#models/organization'
import OrganizationMember from '#models/organization_member'
import { OtpService } from '#services/otp_service'
import {
  sendOtpValidator,
  verifyOtpValidator,
  registerValidator,
  loginValidator,
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
      await OtpService.sendEmail(email!, code)
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
   * POST /api/v1/auth/register
   * Registers a new user (OTP must have been sent and verified before this call).
   */
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    // Re-verify OTP (prevent replay without going through send-otp)
    const valid = await OtpService.verify(data.phone, 'register', data.otpCode)
    if (!valid) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'E_OTP_INVALID', message: 'Invalid or expired OTP code' },
      })
    }

    // Check phone uniqueness
    const existingUser = await User.findBy('phone', data.phone)
    if (existingUser) {
      return response.conflict({
        success: false,
        error: { code: 'E_CONFLICT', message: 'A user with this phone number already exists' },
      })
    }

    const user = await db.transaction(async (trx) => {
      const newUser = await User.create(
        {
          phone: data.phone,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: string.generateRandom(32), // Random password — OTP-based auth
          locale: data.locale ?? 'fr',
          phoneVerifiedAt: DateTime.utc(),
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
   * Login via phone+OTP or email+password.
   */
  async login({ request, response }: HttpContext) {
    const data = await request.validateUsing(loginValidator)

    let user: User | null = null

    // OTP-based login
    if (data.phone && data.otpCode) {
      const valid = await OtpService.verify(data.phone, 'login', data.otpCode)
      if (!valid) {
        return response.unprocessableEntity({
          success: false,
          error: { code: 'E_OTP_INVALID', message: 'Invalid or expired OTP code' },
        })
      }
      user = await User.findBy('phone', data.phone)
    }

    // Email+password login
    if (data.email && data.password) {
      user = await User.query().where('email', data.email).first()
      if (user) {
        const passwordValid = await user.verifyCredentials(data.email, data.password)
        if (!passwordValid) {
          user = null
        }
      }
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
