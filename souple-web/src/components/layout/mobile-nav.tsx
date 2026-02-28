'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Route, Bus, Ticket, CreditCard,
  Bell, Settings, Users, Building2, MapPin, BarChart3,
  Shield, LogOut, X, Menu, MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'

const ICON_SIZE = 18

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

function buildNav(locale: string): NavSection[] {
  return [
    {
      items: [
        { href: `/${locale}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard size={ICON_SIZE} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { href: `/${locale}/dashboard/trips`, label: 'Trips', icon: <Route size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/bookings`, label: 'Bookings', icon: <Ticket size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/fleet`, label: 'Fleet', icon: <Bus size={ICON_SIZE} /> },
      ],
    },
    {
      title: 'Finance',
      items: [
        { href: `/${locale}/dashboard/payments`, label: 'Payments', icon: <CreditCard size={ICON_SIZE} />, roles: ['owner', 'manager', 'finance'] },
        { href: `/${locale}/dashboard/reports`, label: 'Reports', icon: <BarChart3 size={ICON_SIZE} />, roles: ['owner', 'manager', 'finance'] },
      ],
    },
    {
      title: 'Admin',
      items: [
        { href: `/${locale}/dashboard/users`, label: 'Users', icon: <Users size={ICON_SIZE} />, roles: ['owner', 'manager'] },
        { href: `/${locale}/dashboard/organizations`, label: 'Organizations', icon: <Building2 size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/routes`, label: 'Routes', icon: <MapPin size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/messages`, label: 'Messages', icon: <MessageSquare size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/notifications`, label: 'Notifications', icon: <Bell size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/security`, label: 'Security', icon: <Shield size={ICON_SIZE} />, roles: ['owner'] },
      ],
    },
    {
      items: [
        { href: `/${locale}/dashboard/settings`, label: 'Settings', icon: <Settings size={ICON_SIZE} /> },
      ],
    },
  ]
}

function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0A7AFF" />
      <path
        d="M7 12.5C7 10.015 9.015 8 11.5 8H14a3 3 0 010 6h-2.5C9.015 14 7 14 7 12.5z"
        fill="white" fillOpacity="0.9"
      />
      <path
        d="M17 11.5C17 13.985 14.985 16 12.5 16H10a3 3 0 010-6h2.5C14.985 10 17 10 17 11.5z"
        fill="white" fillOpacity="0.5"
      />
    </svg>
  )
}

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const { user, logout } = useAuth()

  // Close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navSections = buildNav(locale)

  return (
    <>
      {/* Hamburger trigger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -ml-1 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-in drawer */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col md:hidden',
          'bg-white dark:bg-[#111111]',
          'border-r border-[#E5E7EB] dark:border-[#2C2C2E]',
          'shadow-[4px_0_24px_rgba(0,0,0,0.12)]',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center h-[52px] px-4 gap-3 border-b border-[#F3F4F6] dark:border-[#2C2C2E] shrink-0">
          <LogoMark />
          <span className="flex-1 text-[15px] font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
            Souple
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5" aria-label="Main navigation">
          {navSections.map((section, si) => {
            const visibleItems = section.items.filter((item) => !item.roles)
            if (visibleItems.length === 0) return null

            return (
              <div key={si}>
                {section.title && (
                  <p className="px-2 mb-1.5 text-[10px] font-semibold text-[#9CA3AF] dark:text-[#4B5563] uppercase tracking-widest">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors duration-100',
                            isActive
                              ? 'bg-[#EFF6FF] dark:bg-[#0A7AFF]/15 text-[#0A7AFF] dark:text-[#60A5FA] font-semibold'
                              : 'text-[#374151] dark:text-[#A0A0A8] hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] font-medium'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 px-2 py-3 border-t border-[#F3F4F6] dark:border-[#2C2C2E] flex items-center gap-2">
          {user && (
            <div className="flex-1 min-w-0 px-1">
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] truncate leading-tight">
                {user.fullName}
              </p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] truncate mt-0.5">
                {user.email ?? user.phone}
              </p>
            </div>
          )}
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#450A0A] transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  )
}
