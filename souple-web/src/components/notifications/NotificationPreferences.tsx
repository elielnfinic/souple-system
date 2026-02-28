'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { notificationsApi } from '@/lib/api/notifications'
import type { NotificationPreference } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES = [
  { key: 'booking_confirmed', label: 'Réservation confirmée' },
  { key: 'payment_receipt', label: 'Reçu de paiement' },
  { key: 'trip_departure_reminder', label: 'Rappel de départ' },
  { key: 'trip_cancelled', label: 'Trajet annulé' },
  { key: 'welcome', label: 'Bienvenue' },
] as const

const CHANNELS = [
  { key: 'email' as const, label: 'Email' },
  { key: 'sms' as const, label: 'SMS' },
  { key: 'telegram' as const, label: 'Telegram' },
  { key: 'push' as const, label: 'Push' },
]

type PrefKey = `${string}:${'email' | 'sms' | 'telegram' | 'push'}`

// ─── Toggle icon ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative inline-flex items-center w-9 h-5 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7AFF] focus-visible:ring-offset-1',
        checked ? 'bg-[#0A7AFF]' : 'bg-[#D1D5DB] dark:bg-[#4B5563]'
      )}
    >
      <span
        className={cn(
          'inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-150',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<Map<PrefKey, boolean>>(new Map())

  // Telegram state
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null)
  const [telegramCode, setTelegramCode] = useState<string | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)

  // Push state
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushDenied, setPushDenied] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const pushSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator

  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load preferences on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await notificationsApi.getPreferences()
        if (cancelled) return
        const map = new Map<PrefKey, boolean>()
        const list = Array.isArray(res.data) ? res.data : []
        list.forEach((p: NotificationPreference) => {
          map.set(`${p.type}:${p.channel}` as PrefKey, p.enabled)
        })
        setPrefs(map)
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Check push permission
    if (pushSupported) {
      if (Notification.permission === 'granted') setPushEnabled(true)
      if (Notification.permission === 'denied') setPushDenied(true)
    }

    load()
    return () => { cancelled = true }
  }, [pushSupported])

  // Get a pref value with sensible default (true)
  function getPref(type: string, channel: NotificationPreference['channel']): boolean {
    const key: PrefKey = `${type}:${channel}`
    return prefs.get(key) ?? true
  }

  // Debounced save
  const savePrefs = useCallback((map: Map<PrefKey, boolean>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const preferences: Array<{ channel: NotificationPreference['channel']; type: string; enabled: boolean }> = []
        map.forEach((enabled, key) => {
          const [type, channel] = key.split(':') as [string, NotificationPreference['channel']]
          preferences.push({ type, channel, enabled })
        })
        await notificationsApi.updatePreferences({ preferences })
      } catch {
        // silent
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [])

  function handleToggle(type: string, channel: NotificationPreference['channel']) {
    setPrefs((prev) => {
      const next = new Map(prev)
      const key: PrefKey = `${type}:${channel}`
      next.set(key, !(prev.get(key) ?? true))
      savePrefs(next)
      return next
    })
  }

  // Telegram
  async function handleTelegramGetCode() {
    setTelegramLoading(true)
    try {
      const res = await notificationsApi.telegramLink()
      setTelegramCode(res.data.code)
    } catch {
      // silent
    } finally {
      setTelegramLoading(false)
    }
  }

  async function handleTelegramUnlink() {
    setTelegramLoading(true)
    try {
      await notificationsApi.telegramUnlink()
      setTelegramLinked(false)
      setTelegramUsername(null)
      setTelegramCode(null)
    } catch {
      // silent
    } finally {
      setTelegramLoading(false)
    }
  }

  // Push
  async function handleEnablePush() {
    if (!pushSupported) return
    setPushLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await notificationsApi.pushSubscribe(subscription.toJSON())
        setPushEnabled(true)
      } else if (permission === 'denied') {
        setPushDenied(true)
      }
    } catch {
      // silent
    } finally {
      setPushLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2C2C2E] last:border-0">
              <Skeleton className="h-4 w-40" />
              <div className="ml-auto flex items-center gap-6">
                {CHANNELS.map((c) => <Skeleton key={c.key} className="h-5 w-9 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Matrix table ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Canaux de notification
          </h2>
          {saving && (
            <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Sauvegarde…</span>
          )}
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider w-1/2">
                  Type de notification
                </th>
                {CHANNELS.map((ch) => (
                  <th
                    key={ch.key}
                    className="text-center px-3 py-3 text-xs font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider"
                  >
                    {ch.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_TYPES.map((nt) => (
                <tr
                  key={nt.key}
                  className="border-b border-[#F3F4F6] dark:border-[#2C2C2E] last:border-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937] transition-colors duration-100"
                >
                  <td className="px-5 py-4 font-medium text-[#374151] dark:text-[#D1D5DB]">
                    {nt.label}
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.key} className="px-3 py-4 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          checked={getPref(nt.key, ch.key)}
                          onChange={() => handleToggle(nt.key, ch.key)}
                          label={`${nt.label} via ${ch.label}`}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Telegram section ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] mb-4">
          Telegram
        </h2>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
          {telegramLinked ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Telegram icon */}
                <span className="w-9 h-9 rounded-full bg-[#E8F4FD] dark:bg-[#0088CC]/15 flex items-center justify-center text-[#0088CC]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.018 9.509c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.18 13.847l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.641.74z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                    Compte Telegram lié
                  </p>
                  {telegramUsername && (
                    <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                      @{telegramUsername}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={telegramLoading}
                onClick={handleTelegramUnlink}
                className="text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#450A0A]"
              >
                Délier
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#F3F4F6] dark:bg-[#374151] flex items-center justify-center text-[#9CA3AF]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.018 9.509c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.18 13.847l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.641.74z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Liez votre Telegram
                  </p>
                  <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                    Recevez vos notifications directement sur Telegram
                  </p>
                </div>
              </div>

              {!telegramCode ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={telegramLoading}
                  onClick={handleTelegramGetCode}
                >
                  Obtenir un code de liaison
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F3F4F6] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151]">
                    <code className="flex-1 text-lg font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tracking-widest">
                      {telegramCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(telegramCode)}
                      className="text-xs text-[#0A7AFF] hover:underline shrink-0"
                      aria-label="Copier le code"
                    >
                      Copier
                    </button>
                  </div>

                  <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                    Envoyez{' '}
                    <code className="px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#374151] text-[#374151] dark:text-[#D1D5DB] font-mono text-xs">
                      /link {telegramCode}
                    </code>{' '}
                    au bot{' '}
                    <a
                      href="https://t.me/SoupleBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A7AFF] hover:underline"
                    >
                      @SoupleBot
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Push notifications section ─────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] mb-4">
          Notifications push
        </h2>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
          {!pushSupported ? (
            <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
              Les notifications push ne sont pas supportées sur ce navigateur.
            </p>
          ) : pushDenied ? (
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#FEF2F2] dark:bg-[#DC2626]/15 flex items-center justify-center text-[#DC2626]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Permission refusée</p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
                  Autorisez les notifications dans les paramètres de votre navigateur.
                </p>
              </div>
            </div>
          ) : pushEnabled ? (
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#F0FDF4] dark:bg-[#16A34A]/15 flex items-center justify-center text-[#16A34A]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
                Notifications push activées
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Activer les notifications push
                </p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
                  Recevez des alertes même quand Souple est en arrière-plan
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                loading={pushLoading}
                onClick={handleEnablePush}
              >
                Activer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
