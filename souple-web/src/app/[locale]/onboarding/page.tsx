'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TextInput, FormField, FormLabel, FormError } from '@/components/ui/form-field'
import { orgsApi, ApiError } from '@/lib/api-client'
import { useAuth, type Membership } from '@/providers/auth-provider'

// ─── Logo ─────────────────────────────────────────────────────────────────────

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0A7AFF" />
      <path
        d="M9 17C9 13.686 11.686 11 15 11H18.5a4 4 0 010 8H15C11.686 19 9 19 9 17z"
        fill="white" fillOpacity="0.9"
      />
      <path
        d="M23 15C23 18.314 20.314 21 17 21H13.5a4 4 0 010-8H17C20.314 13 23 13 23 15z"
        fill="white" fillOpacity="0.45"
      />
    </svg>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={[
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
              step < current
                ? 'bg-[#0A7AFF] text-white'
                : step === current
                ? 'bg-[#0A7AFF] text-white ring-4 ring-[#0A7AFF]/20'
                : 'bg-[#E5E7EB] dark:bg-[#3A3A3C] text-[#9CA3AF] dark:text-[#6B7280]',
            ].join(' ')}
          >
            {step < current ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : step}
          </div>
          {step < 2 && (
            <div className={[
              'w-10 h-0.5 rounded',
              current > step ? 'bg-[#0A7AFF]' : 'bg-[#E5E7EB] dark:bg-[#3A3A3C]',
            ].join(' ')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface OrgForm {
  name: string
  type: 'agency' | 'company' | 'independent' | ''
  city: string
  country: string
  phone: string
  email: string
  address: string
}

const ORG_TYPES = [
  { value: 'agency', label: 'Agence de voyage', desc: 'Compagnie de bus intercités' },
  { value: 'company', label: 'Entreprise de transport', desc: 'Logistique, cargo, location de véhicules' },
  { value: 'independent', label: 'Indépendant', desc: 'Propriétaire ou chauffeur indépendant' },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const { refreshUser, setActiveOrg } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<OrgForm>({
    name: '',
    type: '',
    city: '',
    country: 'CD',
    phone: '',
    email: '',
    address: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof OrgForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.type || !form.name.trim()) return
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.type) return
    setLoading(true)
    setError(null)
    try {
      const res = await orgsApi.create({
        name: form.name.trim(),
        type: form.type,
        city: form.city.trim(),
        country: form.country || 'CD',
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim() || undefined,
      }) as { success: true; data: { id: number; name: string; slug: string; type: string } }

      // Refresh user to get updated memberships (creator is added as owner)
      await refreshUser()

      // Build a membership object to activate immediately without waiting for another refresh
      const newMembership: Membership = {
        organizationId: res.data.id,
        role: 'owner',
        organization: {
          id: res.data.id,
          name: res.data.name,
          slug: res.data.slug,
          type: res.data.type,
        },
      }
      setActiveOrg(newMembership)

      router.replace(`/${locale}/dashboard`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur inattendue s\'est produite')
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

      <div className="relative w-full max-w-[460px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <LogoMark size={48} />
          <span className="text-[22px] font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Souple
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">

          <Steps current={step} />

          {step === 1 ? (
            <>
              <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                Créez votre organisation
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-6">
                Choisissez le type d'organisation qui vous correspond.
              </p>

              <form onSubmit={handleStep1} className="space-y-5">
                {/* Type selector */}
                <div className="space-y-2">
                  {ORG_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update('type', t.value)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-xl border transition-all',
                        form.type === t.value
                          ? 'border-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 ring-1 ring-[#0A7AFF]'
                          : 'border-[#E5E7EB] dark:border-[#3A3A3C] hover:border-[#D1D5DB] dark:hover:border-[#48484A]',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={[
                          'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                          form.type === t.value
                            ? 'border-[#0A7AFF] bg-[#0A7AFF]'
                            : 'border-[#D1D5DB] dark:border-[#48484A]',
                        ].join(' ')}>
                          {form.type === t.value && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                            {t.label}
                          </div>
                          <div className="text-xs text-[#6B7280] dark:text-[#8E8E93]">{t.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <FormField>
                  <FormLabel htmlFor="org-name" required>Nom de l'organisation</FormLabel>
                  <TextInput
                    id="org-name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="ex. Transco Kinshasa"
                    required
                    minLength={2}
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!form.type || !form.name.trim()}
                >
                  Continuer
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setError(null) }}
                className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] dark:text-[#8E8E93] hover:text-[#374151] dark:hover:text-[#D1D5DB] mb-5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Retour
              </button>

              <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">
                Informations de contact
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mb-6">
                Ces informations seront visibles par vos clients.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="org-city" required>Ville</FormLabel>
                  <TextInput
                    id="org-city"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="ex. Kinshasa"
                    required
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="org-phone" required>Téléphone</FormLabel>
                  <TextInput
                    id="org-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+243 812 345 678"
                    required
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="org-email" required>Email</FormLabel>
                  <TextInput
                    id="org-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="contact@organisation.com"
                    required
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="org-address">
                    Adresse{' '}
                    <span className="text-[#9CA3AF] font-normal text-xs">(optionnel)</span>
                  </FormLabel>
                  <TextInput
                    id="org-address"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="ex. Avenue du Commerce 12, Gombe"
                  />
                </FormField>

                {error && <FormError role="alert">{error}</FormError>}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Créer l'organisation
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          © {new Date().getFullYear()} Souple · Transportation Platform
        </p>
      </div>
    </div>
  )
}
