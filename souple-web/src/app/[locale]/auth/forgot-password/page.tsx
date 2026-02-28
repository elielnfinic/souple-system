'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { TextInput, PasswordInput, OtpInput, FormField, FormLabel, FormError } from '@/components/ui/form-field'
import { authApi, ApiError } from '@/lib/api-client'
import Link from 'next/link'

type Step = 'email' | 'reset'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.forgotPassword(email.trim())
      setStep('reset')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError(t('password_too_short'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await authApi.resetPassword({ email: email.trim(), otpCode, newPassword })
      setSuccess(true)
      setTimeout(() => router.push(`/${locale}/auth/login`), 2000)
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'E_OTP_INVALID'
          ? t('otp_invalid')
          : err instanceof ApiError ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F5F5F7] dark:bg-[#000000]">
      <div
        className="dark:hidden absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #dbeafe 0%, #f5f5f7 55%)' }}
        aria-hidden
      />
      <div
        className="hidden dark:block absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #0a2540 0%, #000000 55%)' }}
        aria-hidden
      />

      <div className="relative w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="#0A7AFF" />
            <path d="M9 17C9 13.686 11.686 11 15 11H18.5a4 4 0 010 8H15C11.686 19 9 19 9 17z" fill="white" fillOpacity="0.9" />
            <path d="M23 15C23 18.314 20.314 21 17 21H13.5a4 4 0 010-8H17C20.314 13 23 13 23 15z" fill="white" fillOpacity="0.45" />
          </svg>
          <span className="text-[22px] font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">Souple</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">

          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] dark:bg-[#14532D] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[#111827] dark:text-[#F9FAFB] font-semibold">
                {t('reset_success')}
              </p>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mt-1">
                {t('redirecting_to_login')}
              </p>
            </div>
          ) : step === 'email' ? (
            <>
              <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('forgot_password_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-6">
                {t('forgot_password_subtitle')}
              </p>
              <form onSubmit={handleSendCode} className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="fp-email" required>{t('email')}</FormLabel>
                  <TextInput
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoFocus
                    autoComplete="email"
                    required
                  />
                </FormField>
                {error && <FormError role="alert">{error}</FormError>}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {t('send_reset_code')}
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('email'); setOtpCode(''); setError(null) }}
                className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] dark:text-[#8E8E93] hover:text-[#374151] dark:hover:text-[#D1D5DB] mb-5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('back_to_login')}
              </button>
              <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('reset_password_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-6">
                {t('reset_password_subtitle')}
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <FormField>
                  <FormLabel>{t('otp_code')}</FormLabel>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    length={6}
                    disabled={loading}
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="fp-newpw" required>{t('new_password')}</FormLabel>
                  <PasswordInput
                    id="fp-newpw"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    autoComplete="new-password"
                    showToggleLabel={t('show_password')}
                    hideToggleLabel={t('hide_password')}
                    required
                  />
                </FormField>
                {error && <FormError role="alert">{error}</FormError>}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={otpCode.length !== 6 || newPassword.length < 8}
                >
                  {t('reset_password')}
                </Button>
              </form>
            </>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-[#6B7280] dark:text-[#8E8E93]">
              <Link href={`/${locale}/auth/login`} className="text-[#0A7AFF] font-semibold hover:underline">
                {t('back_to_login')}
              </Link>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          © {new Date().getFullYear()} Souple · Transportation Platform
        </p>
      </div>
    </div>
  )
}
