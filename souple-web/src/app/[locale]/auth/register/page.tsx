'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  PhoneInput, OtpInput, TextInput,
  FormField, FormLabel, FormError
} from '@/components/ui/form-field'
import { authApi, ApiError } from '@/lib/api-client'
import { setAccessToken } from '@/lib/api-client'
import Link from 'next/link'

type Step = 'phone' | 'otp' | 'profile'

interface FormData {
  phone: string
  otp: string
  firstName: string
  lastName: string
  email: string
}

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()

  const [step, setStep] = useState<Step>('phone')
  const [form, setForm] = useState<FormData>({
    phone: '', otp: '', firstName: '', lastName: '', email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.sendOtp({ phone: `+243${form.phone}`, purpose: 'register' })
      setStep('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.otp.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      await authApi.verifyOtp({
        phone: `+243${form.phone}`,
        code: form.otp,
        purpose: 'register',
      })
      setStep('profile')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.register({
        phone: `+243${form.phone}`,
        email: form.email || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        otpCode: form.otp,
        locale: 'fr',
      }) as { success: true; data: { token: { token: string } } }

      localStorage.setItem('souple-access-token', res.data.token.token)
      setAccessToken(res.data.token.token)
      router.push('/fr/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#030712] px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-[#0A7AFF]">Souple</span>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E5E7EB] dark:border-[#374151] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)] p-8">

          {/* Step 1: Phone */}
          {step === 'phone' && (
            <>
              <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('register_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6">
                {t('login_subtitle')}
              </p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="reg-phone" required>{t('phone')}</FormLabel>
                  <PhoneInput
                    id="reg-phone"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="812 345 678"
                    autoFocus required
                  />
                </FormField>
                {error && <FormError role="alert">{error}</FormError>}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {t('send_otp')}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                {t('have_account')}{' '}
                <Link href="./login" className="text-[#0A7AFF] font-medium hover:underline">
                  {t('login')}
                </Link>
              </p>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <>
              <button onClick={() => setStep('phone')} className="text-sm text-[#6B7280] mb-4">← Back</button>
              <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                {t('otp_title')}
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6">
                {t('otp_subtitle', { phone: `+243 ${form.phone}` })}
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <FormField>
                  <FormLabel>{t('otp_code')}</FormLabel>
                  <OtpInput
                    value={form.otp}
                    onChange={(v) => update('otp', v)}
                    length={6}
                    error={error ?? undefined}
                    disabled={loading}
                  />
                </FormField>
                {error && <FormError role="alert">{error}</FormError>}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={form.otp.length !== 6}>
                  {t('verify')}
                </Button>
              </form>
            </>
          )}

          {/* Step 3: Profile */}
          {step === 'profile' && (
            <>
              <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                Complete your profile
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6">
                Just a few details to get started.
              </p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField>
                    <FormLabel htmlFor="first-name" required>{t('first_name')}</FormLabel>
                    <TextInput
                      id="first-name"
                      value={form.firstName}
                      onChange={(e) => update('firstName', e.target.value)}
                      placeholder="Kongo"
                      autoFocus required
                    />
                  </FormField>
                  <FormField>
                    <FormLabel htmlFor="last-name" required>{t('last_name')}</FormLabel>
                    <TextInput
                      id="last-name"
                      value={form.lastName}
                      onChange={(e) => update('lastName', e.target.value)}
                      placeholder="Diallo"
                      required
                    />
                  </FormField>
                </div>
                <FormField>
                  <FormLabel htmlFor="email">{t('email')} <span className="text-[#9CA3AF] font-normal">(optional)</span></FormLabel>
                  <TextInput
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </FormField>
                {error && <FormError role="alert">{error}</FormError>}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  Create account
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
