'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'

// ─── Full-page loading spinner ────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F5F5F7] dark:bg-[#000000]">
      <div className="w-8 h-8 rounded-full border-2 border-[#0A7AFF] border-t-transparent animate-spin" />
      <p className="text-sm text-[#9CA3AF]">Chargement…</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  children: React.ReactNode
  locale: string
}

export function DashboardShell({ children, locale }: DashboardShellProps) {
  const { user, isLoading, isAuthenticated, activeOrg } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Not logged in → send to login
    if (!isAuthenticated) {
      router.replace(`/${locale}/auth/login`)
      return
    }

    // Logged in but no org, and not a super admin → send to onboarding
    if (!user?.isSuperAdmin && !activeOrg) {
      router.replace(`/${locale}/onboarding`)
    }
  }, [isLoading, isAuthenticated, activeOrg, user, router, locale])

  // Show spinner while session is being restored
  if (isLoading) return <LoadingScreen />

  // Render nothing while redirecting (prevents a flash of the dashboard)
  if (!isAuthenticated) return null
  if (!user?.isSuperAdmin && !activeOrg) return null

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#000000]">
      {/* Sidebar — hidden on mobile, shown md+ */}
      <div className="hidden md:flex flex-col h-full shrink-0">
        <Sidebar locale={locale} userRole={activeOrg?.role} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
