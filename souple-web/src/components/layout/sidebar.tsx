'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Route, Bus, Ticket, CreditCard,
  Bell, Settings, Users, Building2, MapPin, BarChart3,
  Shield, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'

// ─── Nav Item definitions ─────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  roles?: string[]  // If set, only show for these roles
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const ICON_SIZE = 20

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

const SIDEBAR_KEY = 'souple-sidebar-collapsed'

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  locale: string
  userRole?: string
}

export function Sidebar({ locale, userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Restore collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

  const navSections = buildNav(locale)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-full border-r border-[#E5E7EB] dark:border-[#374151]',
        'bg-white dark:bg-[#111827]',
        'transition-[width] duration-200 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-[#E5E7EB] dark:border-[#374151] shrink-0',
        collapsed ? 'justify-center px-0' : 'px-4 gap-2'
      )}>
        <span className="text-[#0A7AFF] font-bold text-lg">
          {collapsed ? 'S' : 'Souple'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section, si) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.roles) return true
            if (!userRole) return false
            return item.roles.includes(userRole)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={si}>
              {!collapsed && section.title && (
                <p className="px-2 mb-1 text-xs font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider">
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
                          'flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium',
                          'transition-colors duration-100',
                          isActive
                            ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#0A7AFF] border-l-2 border-[#0A7AFF] -ml-0.5 pl-2.5'
                            : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]',
                          collapsed && 'justify-center px-0 py-2.5'
                        )}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#0A7AFF] rounded-full">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User section */}
      <div className={cn(
        'shrink-0 border-t border-[#E5E7EB] dark:border-[#374151] p-3',
        collapsed ? 'flex justify-center' : 'flex items-center gap-2'
      )}>
        {!collapsed && user && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">
              {user.email ?? user.phone}
            </p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#450A0A] transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className={cn(
          'absolute right-0 translate-x-1/2 top-16',
          'w-5 h-5 rounded-full border border-[#E5E7EB] dark:border-[#374151]',
          'bg-white dark:bg-[#1F2937] text-[#6B7280]',
          'flex items-center justify-center',
          'hover:border-[#0A7AFF] hover:text-[#0A7AFF] transition-colors'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
