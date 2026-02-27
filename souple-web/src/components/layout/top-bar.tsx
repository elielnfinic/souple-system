'use client'

import { Bell, Search, Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { useTheme } from '@/providers/theme-provider'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'

interface TopBarProps {
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function TopBar({ breadcrumbs }: TopBarProps) {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  const cycleTheme = () => {
    const order: Array<typeof theme> = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next!)
  }

  const ThemeIcon =
    theme === 'light' ? Sun
    : theme === 'dark' ? Moon
    : Monitor

  return (
    <header className="sticky top-0 z-40 flex items-center h-14 px-4 gap-3 border-b border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827]">
      {/* Breadcrumbs */}
      <nav className="flex-1 flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
        {breadcrumbs?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-[#D1D5DB] dark:text-[#4B5563]">/</span>}
            <span
              className={cn(
                'truncate',
                i === (breadcrumbs.length - 1)
                  ? 'text-[#111827] dark:text-[#F9FAFB] font-medium'
                  : 'text-[#6B7280] dark:text-[#9CA3AF]'
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Global search */}
      <button
        className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-[#E5E7EB] dark:border-[#374151] text-sm text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-[#4B5563] transition-colors"
        aria-label="Search (Cmd+K)"
      >
        <Search size={14} aria-hidden="true" />
        <span>Search…</span>
        <kbd className="ml-2 text-xs border border-[#E5E7EB] dark:border-[#374151] px-1 rounded">⌘K</kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
          aria-label={`Theme: ${theme}. Click to cycle.`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={18} aria-hidden="true" />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} aria-hidden="true" />
          {/* Unread badge — populated dynamically */}
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626] ring-2 ring-white dark:ring-[#111827]"
            aria-hidden="true"
          />
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 h-8 pl-2 pr-1.5 rounded-md hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors">
          <span className="w-6 h-6 rounded-full bg-[#0A7AFF] flex items-center justify-center text-xs font-bold text-white select-none" aria-hidden="true">
            {user?.firstName?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="hidden sm:block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] max-w-24 truncate">
            {user?.firstName}
          </span>
          <ChevronDown size={14} className="text-[#9CA3AF]" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
