import redis from '@adonisjs/redis/services/main'
import { OTP_LENGTH, OTP_EXPIRY_MINUTES } from '@souple/shared/constants'
import type { OtpPurpose } from '@souple/shared'
import { EmailService } from '#services/email_service'

const OTP_CHARS = '0123456789'

export class OtpService {
  private static redisKey(identifier: string, purpose: OtpPurpose): string {
    return `otp:${purpose}:${identifier}`
  }

  /**
   * Generate a cryptographically random OTP code.
   */
  static generate(): string {
    let code = ''
    for (let i = 0; i < OTP_LENGTH; i++) {
      code += OTP_CHARS[Math.floor(Math.random() * OTP_CHARS.length)]
    }
    return code
  }

  /**
   * Store OTP in Redis with TTL.
   * Overwrites any existing OTP for the same identifier+purpose.
   */
  static async store(identifier: string, purpose: OtpPurpose, code: string): Promise<void> {
    const key = this.redisKey(identifier, purpose)
    await redis.setex(key, OTP_EXPIRY_MINUTES * 60, code)
  }

  /**
   * Verify OTP. Returns true if valid, false if invalid or expired.
   * Deletes the OTP from Redis after a successful verification.
   */
  static async verify(identifier: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const key = this.redisKey(identifier, purpose)
    const stored = await redis.get(key)

    if (!stored || stored !== code) {
      return false
    }

    await redis.del(key)
    return true
  }

  /**
   * Check if an OTP exists (without consuming it).
   */
  static async exists(identifier: string, purpose: OtpPurpose): Promise<boolean> {
    const key = this.redisKey(identifier, purpose)
    return (await redis.exists(key)) === 1
  }

  /**
   * Send OTP via SMS.
   * In Skill 01, this is a stub — real SMS integration is in Skill 06.
   */
  static async send(phone: string, code: string): Promise<void> {
    const smsProvider = process.env.SMS_PROVIDER ?? 'stub'

    if (smsProvider === 'stub') {
      // Development: log to console, never send real SMS
      console.log(`[OTP STUB] Phone: ${phone} | Code: ${code}`)
      return
    }

    // Real SMS integration added in Skill 06
    throw new Error(`SMS provider "${smsProvider}" not yet implemented`)
  }

  /**
   * Send OTP via email for a given purpose.
   * @param purpose defaults to 'login' if not provided (legacy callers)
   */
  static async sendEmail(
    email: string,
    code: string,
    purpose: 'login' | 'register' | 'password_reset' = 'login',
    locale: string = 'fr'
  ): Promise<void> {
    await EmailService.sendOtp(email, code, purpose, locale)
  }
}
