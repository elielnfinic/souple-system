'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  TextInput, PasswordInput, OtpInput,
  FormField, FormLabel, FormError,
} from '@/components/ui/form-field'
import { useAuth } from '@/providers/auth-provider'
import { authApi, ApiError } from '@/lib/api-client'
import Link from 'next/link'

type Tab = 'email-password' | 'phone-password' | 'otp'
type OtpStep = 'identifier' | 'code'

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0A7AFF" />
      <path d="M9 17C9 13.686 11.686 11 15 11H18.5a4 4 0 010 8H15C11.686 19 9 19 9 17z" fill="white" fillOpacity="0.9" />
      <path d="M23 15C23 18.314 20.314 21 17 21H13.5a4 4 0 010-8H17C20.314 13 23 13 23 15z" fill="white" fillOpacity="0.45" />
    </svg>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const { login } = useAuth()

  const [tab, setTab] = useState<Tab>('email-password')

  const [epEmail, setEpEmail] = useState('')
  const [epPassword, setEpPassword] = useState('')

  const [ppPhone, setPpPhone] = useState('')
  const [ppPassword, setPpPassword] = useState('')

  const [otpIdentifier, setOtpIdentifier] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState<OtpStep>('identifier')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const afterLogin = () => router.push(`/${locale}/dashboard`)

  const handleTabChange = (next: Tab) => {
    setTab(next)
    setError(null)
  }

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email: epEmail.trim(), password: epPassword })
      afterLogin()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePhonePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ phone: ppPhone.trim(), password: ppPassword })
      afterLogin()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpIdentifier.trim()) return
    setLoading(true)
    setError(null)
    const isEmail = otpIdentifier.includes('@')
    try {
      await authApi.sendOtp({
        [isEmail ? 'email' : 'phone']: otpIdentifier.trim(),
        purpose: 'login',
      })
      setOtpStep('code')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) return
    setLoading(true)
    setError(null)
    const isEmail = otpIdentifier.includes('@')
    try {
      await login({
        [isEmail ? 'email' : 'phone']: otpIdentifier.trim(),
        otpCode,
      })
      afterLogin()
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'email-password', label: t('tab_email_password') },
    { key: 'phone-password', label: t('tab_phone_password') },
    { key: 'otp', label: t('tab_otp') },
  ]

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
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-5">
            {t('login_title')}
          </h1>

          {/* Tabs */}
          <div className="flex rounded-lg bg-[#F3F4F6] dark:bg-[#2C2C2E] p-1 mb-6 gap-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={[
                  'flex-1 text-xs font-medium py-1.5 rounded-md transition-all',
                  tab === key
                    ? 'bg-white dark:bg-[#3A3A3C] text-[#111827] dark:text-[#F9FAFB] shadow-sm'
                    : 'text-[#6B7280] dark:text-[#8E8E93] hover:text-[#374151] dark:hover:text-[#D1D5DB]',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Email + Password ── */}
          {tab === 'email-password' && (
            <>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-5">
                {t('login_email_subtitle')}
              </p>
              <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="ep-email" required>{t('email')}</FormLabel>
                  <TextInput
                    id="ep-email"
                    type="email"
                    value={epEmail}
                    onChange={(e) => setEpEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoFocus
                    autoComplete="email"
                    required
                  />
                </FormField>
                <FormField>
                  <div className="flex items-center justify-between mb-1">
                    <FormLabel htmlFor="ep-password" required>{t('password')}</FormLabel>
                    <Link href={`/${locale}/auth/forgot-password`} className="text-xs text-[#0A7AFF] hover:underline">
                      {t('forgot_password')}
                    </Link>
                  </div>
                  <PasswordInput
                    id="ep-password"
                    value={epPassword}
                    onChange={(e) => setEpPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    autoComplete="current-password"
                    showToggleLabel={t('show_password')}
                    hideToggleLabel={t('hide_password')}
                    required
                  />
                </FormField>
                {error && <FormError>{error}</FormError>}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {t('sign_in')}
                </Button>
              </form>
            </>
          )}

          {/* ── Phone + Password ── */}
          {tab === 'phone-password' && (
            <>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-5">
                {t('login_phone_subtitle')}
              </p>
              <form onSubmit={handlePhonePasswordLogin} className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="pp-phone" required>{t('phone')}</FormLabel>
                  <TextInput
                    id="pp-phone"
                    type="tel"
                    value={ppPhone}
                    onChange={(e) => setPpPhone(e.target.value)}
                    placeholder="+243 812 345 678"
                    autoFocus
                    autoComplete="tel"
                    required
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="pp-password" required>{t('password')}</FormLabel>
                  <PasswordInput
                    id="pp-password"
                    value={ppPassword}
                    onChange={(e) => setPpPassword(e.target.value)}
                    placeholder={t('password_placeholder')}
                    autoComplete="current-password"
                    showToggleLabel={t('show_password')}
                    hideToggleLabel={t('hide_password')}
                    required
                  />
                </FormField>
                {error && <FormError>{error}</FormError>}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {t('sign_in')}
                </Button>
              </form>
            </>
          )}

          {/* ── OTP ── */}
          {tab === 'otp' && (
            <>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-5">
                {t('login_otp_subtitle')}
              </p>

              {otpStep === 'identifier' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <FormField>
                    <FormLabel htmlFor="otp-id" required>{t('otp_identifier')}</FormLabel>
                    <TextInput
                      id="otp-id"
                      value={otpIdentifier}
                      onChange={(e) => setOtpIdentifier(e.target.value)}
                      placeholder="+243 812 345 678 ou email"
                      autoFocus
                      required
                    />
                  </FormField>
                  {error && <FormError>{error}</FormError>}
                  <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                    {t('send_otp')}
                  </Button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => { setOtpStep('identifier'); setOtpCode(''); setError(null) }}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] dark:text-[#8E8E93] hover:text-[#374151] dark:hover:text-[#D1D5DB] mb-5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('back_to_login')}
                  </button>
                  <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-4">
                    {t('otp_subtitle', { phone: otpIdentifier })}
                  </p>
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <FormField>
                      <FormLabel>{t('otp_code')}</FormLabel>
                      <OtpInput value={otpCode} onChange={setOtpCode} length={6} error={error ?? undefined} disabled={loading} />
                    </FormField>
                    {error && <FormError>{error}</FormError>}
                    <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={otpCode.length !== 6}>
                      {t('verify')}
                    </Button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full text-center text-sm text-[#0A7AFF] font-medium hover:underline"
                    >
                      {t('resend_otp')}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          <p className="mt-6 text-center text-sm text-[#6B7280] dark:text-[#8E8E93]">
            {t('no_account')}{' '}
            <Link href={`/${locale}/auth/register`} className="text-[#0A7AFF] font-semibold hover:underline">
              {t('register')}
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
