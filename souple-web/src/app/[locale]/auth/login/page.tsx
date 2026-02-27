'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { PhoneInput, OtpInput, FormField, FormLabel, FormError } from '@/components/ui/form-field'
import { useAuth } from '@/providers/auth-provider'
import { authApi, ApiError } from '@/lib/api-client'
import Link from 'next/link'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const { login } = useAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    setLoading(true)
    setError(null)

    try {
      await authApi.sendOtp({ phone: `+243${phone.trim()}`, purpose: 'login' })
      setStep('otp')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) return

    setLoading(true)
    setError(null)

    try {
      await login({ phone: `+243${phone.trim()}`, otpCode: otp })
      router.push('/fr/dashboard') // TODO: locale-aware redirect
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'E_OTP_INVALID' ? 'Invalid or expired code. Try again.' : err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#030712] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-[#0A7AFF]">Souple</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E5E7EB] dark:border-[#374151] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)] p-8">
          {step === 'phone' ? (
            <>
              <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('login_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6">
                {t('login_subtitle')}
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="phone" required>{t('phone')}</FormLabel>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="812 345 678"
                    autoFocus
                    autoComplete="tel"
                    required
                    error={error ?? undefined}
                  />
                  {error && !phone && <FormError>{error}</FormError>}
                </FormField>

                {error && <FormError role="alert">{error}</FormError>}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  {t('send_otp')}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                {t('no_account')}{' '}
                <Link href="./register" className="text-[#0A7AFF] font-medium hover:underline">
                  {t('register')}
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
                className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#374151] mb-4 -ml-1 px-1 py-0.5 rounded"
                aria-label="Go back"
              >
                ← Back
              </button>

              <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('otp_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6">
                {t('otp_subtitle', { phone: `+243 ${phone}` })}
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <FormField>
                  <FormLabel>{t('otp_code')}</FormLabel>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={6}
                    error={error ?? undefined}
                    disabled={loading}
                  />
                </FormField>

                {error && <FormError role="alert">{error}</FormError>}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={otp.length !== 6}
                >
                  {tActions('confirm')}
                </Button>

                <button
                  type="button"
                  onClick={() => handleSendOtp({ preventDefault: () => {} } as React.FormEvent)}
                  className="w-full text-center text-sm text-[#0A7AFF] hover:underline"
                >
                  {t('resend_otp')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
