'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Route, Bus, Ticket, CreditCard,
  Bell, Settings, Users, Building2, MapPin, BarChart3,
  Shield, ChevronLeft, ChevronRight, LogOut,
  ShoppingCart, Tag, MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  roles?: string[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const ICON_SIZE = 18

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
        { href: `/${locale}/dashboard/trips`, label: 'Trajets', icon: <Route size={ICON_SIZE} />, roles: ['org_admin', 'manager', 'super_admin', 'owner'] },
        { href: `/${locale}/dashboard/bookings`, label: 'Bookings', icon: <Ticket size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/pos`, label: 'POS', icon: <ShoppingCart size={ICON_SIZE} />, roles: ['ticketer', 'manager', 'org_admin', 'owner', 'super_admin'] },
        { href: `/${locale}/dashboard/fleet`, label: 'Fleet', icon: <Bus size={ICON_SIZE} /> },
        { href: `/${locale}/dashboard/prices`, label: 'Tarifs', icon: <Tag size={ICON_SIZE} />, roles: ['org_admin', 'manager', 'owner', 'super_admin'] },
      ],
    },
    {
      title: 'Finance',
      items: [
        { href: `/${locale}/dashboard/payments`, label: 'Paiements', icon: <CreditCard size={ICON_SIZE} />, roles: ['org_admin', 'manager', 'owner', 'super_admin'] },
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

const SIDEBAR_KEY = 'souple-sidebar-collapsed'

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0A7AFF" />
      <path
        d="M7 12.5C7 10.015 9.015 8 11.5 8H14a3 3 0 010 6h-2.5C9.015 14 7 14 7 12.5z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M17 11.5C17 13.985 14.985 16 12.5 16H10a3 3 0 010-6h2.5C14.985 10 17 10 17 11.5z"
        fill="white"
        fillOpacity="0.5"
      />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  locale: string
  userRole?: string
}

export function Sidebar({ locale, userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored !== null) {
      setCollapsed(stored === 'true')
    } else if (window.innerWidth < 1024) {
      // Default collapsed on tablet (md), expanded on desktop (lg+)
      setCollapsed(true)
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

  const navSections = buildNav(locale)
  const isSuperAdmin = user?.isSuperAdmin ?? false

  return (
    <aside
      className={cn(
        'flex flex-col h-full',
        'border-r border-[#E5E7EB] dark:border-[#2C2C2E]',
        'bg-white dark:bg-[#111111]',
        'transition-[width] duration-200 ease-in-out shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
      aria-label="Sidebar navigation"
    >
      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-[52px] shrink-0 px-3 gap-2.5',
        'border-b border-[#F3F4F6] dark:border-[#2C2C2E]',
      )}>
        <LogoMark size={28} />
        {!collapsed && (
          <span className="flex-1 text-[15px] font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
            Souple
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
            'text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB]',
            'hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E]',
            'transition-colors duration-100',
            collapsed && 'mx-auto'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5" aria-label="Main navigation">
        {navSections.map((section, si) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.roles) return true
            if (isSuperAdmin) return true
            if (!userRole) return false
            return item.roles.includes(userRole)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={si}>
              {!collapsed && section.title && (
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
                          'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors duration-100',
                          isActive
                            ? 'bg-[#EFF6FF] dark:bg-[#0A7AFF]/15 text-[#0A7AFF] dark:text-[#60A5FA] font-semibold'
                            : 'text-[#374151] dark:text-[#A0A0A8] hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] font-medium',
                          collapsed && 'justify-center px-2'
                        )}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#0A7AFF] rounded-full">
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

      {/* ── User ──────────────────────────────────────────────────────────── */}
      <div className={cn(
        'shrink-0 px-2 py-3',
        'border-t border-[#F3F4F6] dark:border-[#2C2C2E]',
        collapsed ? 'flex justify-center' : 'flex items-center gap-2'
      )}>
        {!collapsed && user && (
          <div className="flex-1 min-w-0">
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
          className={cn(
            'p-1.5 rounded-lg text-[#9CA3AF] shrink-0',
            'hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#450A0A]',
            'transition-colors duration-100'
          )}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
