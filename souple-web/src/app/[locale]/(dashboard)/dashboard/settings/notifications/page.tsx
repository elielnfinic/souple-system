'use client'

import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'

export default function SettingsNotificationsPage() {
  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
          Préférences de notifications
        </h1>
        <p className="mt-0.5 text-sm text-[#9CA3AF] dark:text-[#6B7280]">
          Choisissez comment et quand vous souhaitez être notifié.
        </p>
      </div>

      {/* ── Preferences ─────────────────────────────────────────────────────── */}
      <NotificationPreferences />
    </div>
  )
}
