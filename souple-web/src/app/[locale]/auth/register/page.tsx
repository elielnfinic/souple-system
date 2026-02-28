'use client'

import { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { TextInput, PasswordInput, OtpInput, FormField, FormLabel, FormError } from '@/components/ui/form-field'
import { authApi, ApiError } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import Link from 'next/link'

type Step = 'form' | 'otp'

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0A7AFF" />
      <path d="M9 17C9 13.686 11.686 11 15 11H18.5a4 4 0 010 8H15C11.686 19 9 19 9 17z" fill="white" fillOpacity="0.9" />
      <path d="M23 15C23 18.314 20.314 21 17 21H13.5a4 4 0 010-8H17C20.314 13 23 13 23 15z" fill="white" fillOpacity="0.45" />
    </svg>
  )
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  const map = [
    { label: '', color: '' },
    { label: 'Faible', color: '#EF4444' },
    { label: 'Moyen', color: '#F59E0B' },
    { label: 'Fort', color: '#10B981' },
  ] as const
  return { score: score as 0 | 1 | 2 | 3, ...map[score] }
}

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const { login } = useAuth()

  const [step, setStep] = useState<Step>('form')

  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // OTP step
  const [otpCode, setOtpCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = useMemo(() => passwordStrength(password), [password])

  // ── Step 1: validate form + send OTP to email ────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t('password_too_short'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('password_mismatch'))
      return
    }

    setLoading(true)
    try {
      await authApi.sendRegistrationOtp({
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        locale,
      })
      setStep('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP + create account ─────────────────────────────────────
  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      await authApi.register({
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        otpCode,
        locale,
        timezone: typeof window !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined,
      })
      // Log in immediately — login endpoint returns memberships so no onboarding loop
      await login({ email: email.trim(), password })
      router.push(`/${locale}/dashboard`)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'E_OTP_INVALID') {
        setError(t('otp_invalid'))
      } else {
        setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setLoading(true)
    setError(null)
    try {
      await authApi.sendRegistrationOtp({
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        locale,
      })
      setOtpCode('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
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
        <div className="flex flex-col items-center mb-8 gap-3">
          <LogoMark />
          <span className="text-[22px] font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">Souple</span>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">

          {/* ── Step 1: Registration form ── */}
          {step === 'form' && (
            <>
              <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('register_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-6">
                {t('register_subtitle')}
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField>
                    <FormLabel htmlFor="reg-first" required>{t('first_name')}</FormLabel>
                    <TextInput
                      id="reg-first"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Kongo"
                      autoFocus
                      autoComplete="given-name"
                      required
                    />
                  </FormField>
                  <FormField>
                    <FormLabel htmlFor="reg-last" required>{t('last_name')}</FormLabel>
                    <TextInput
                      id="reg-last"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Diallo"
                      autoComplete="family-name"
                      required
                    />
                  </FormField>
                </div>

                <FormField>
                  <FormLabel htmlFor="reg-email" required>{t('email')}</FormLabel>
                  <TextInput
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    required
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="reg-phone">{t('phone_optional')}</FormLabel>
                  <TextInput
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 812 345 678"
                    autoComplete="tel"
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="reg-password" required>{t('password')}</FormLabel>
                  <PasswordInput
                    id="reg-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    autoComplete="new-password"
                    showToggleLabel={t('show_password')}
                    hideToggleLabel={t('hide_password')}
                    required
                  />
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {([1, 2, 3] as const).map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors duration-300"
                            style={{ backgroundColor: strength.score >= i ? strength.color : '#E5E7EB' }}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                      )}
                    </div>
                  )}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="reg-confirm" required>{t('confirm_password')}</FormLabel>
                  <PasswordInput
                    id="reg-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    autoComplete="new-password"
                    showToggleLabel={t('show_password')}
                    hideToggleLabel={t('hide_password')}
                    required
                  />
                </FormField>

                {error && <FormError>{error}</FormError>}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {loading ? t('checking_email') : t('create_account')}
                </Button>
              </form>
            </>
          )}

          {/* ── Step 2: OTP verification ── */}
          {step === 'otp' && (
            <>
              <button
                onClick={() => { setStep('form'); setOtpCode(''); setError(null) }}
                className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] dark:text-[#8E8E93] hover:text-[#374151] dark:hover:text-[#D1D5DB] mb-5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('back_to_login')}
              </button>

              <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('verify_email_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-6">
                {t('verify_email_subtitle', { email: email.trim() })}
              </p>

              <form onSubmit={handleVerifyAndCreate} className="space-y-4">
                <FormField>
                  <FormLabel>{t('otp_code')}</FormLabel>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    length={6}
                    error={error ?? undefined}
                    disabled={loading}
                  />
                </FormField>
                {error && <FormError>{error}</FormError>}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={otpCode.length !== 6}
                >
                  {t('verify_and_create')}
                </Button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="w-full text-center text-sm text-[#0A7AFF] font-medium hover:underline disabled:opacity-50"
                >
                  {t('resend_otp')}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-[#6B7280] dark:text-[#8E8E93]">
            {t('have_account')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-[#0A7AFF] font-semibold hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          © {new Date().getFullYear()} Souple · Transportation Platform
        </p>
      </div>
    </div>
  )
}
