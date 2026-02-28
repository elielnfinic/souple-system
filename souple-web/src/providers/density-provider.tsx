'use client'

/**
 * DensityProvider
 *
 * Applies role-based UI density across the app:
 *   passenger                      → spacious (larger padding, font, touch targets)
 *   org_admin / manager / driver
 *   ticketer / super_admin         → dense (compact, data-rich dashboards)
 *
 * CSS custom properties are set on <html> so they cascade everywhere:
 *   --density-px       padding-x for containers
 *   --density-py       padding-y for containers
 *   --density-gap      gap between items in lists/grids
 *   --density-row-h    table/list row height
 *   --density-text     base font size for density-aware text
 */

import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'

export type Density = 'spacious' | 'dense'

interface DensityContextValue {
  density: Density
}

const DensityContext = createContext<DensityContextValue>({ density: 'spacious' })

// ─── Role mapping ─────────────────────────────────────────────────────────────

const DENSE_ROLES = new Set([
  'super_admin',
  'org_admin',
  'manager',
  'driver',
  'ticketer',
])

const CSS_VARS: Record<Density, Record<string, string>> = {
  spacious: {
    '--density-px':     '1.5rem',   // 24px
    '--density-py':     '1rem',     // 16px
    '--density-gap':    '1.5rem',   // 24px
    '--density-row-h':  '3.5rem',   // 56px
    '--density-text':   '1rem',     // 16px
  },
  dense: {
    '--density-px':     '1rem',     // 16px
    '--density-py':     '0.5rem',   // 8px
    '--density-gap':    '0.75rem',  // 12px
    '--density-row-h':  '2.5rem',   // 40px
    '--density-text':   '0.875rem', // 14px
  },
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const density: Density = useMemo(() => {
    if (!user) return 'spacious'

    // Super admin always gets dense
    if (user.isSuperAdmin) return 'dense'

    // Check the active membership role
    const activeRole = user.memberships?.[0]?.role
    return activeRole && DENSE_ROLES.has(activeRole) ? 'dense' : 'spacious'
  }, [user])

  // Apply CSS custom properties to <html>
  useEffect(() => {
    const root = document.documentElement
    const vars = CSS_VARS[density]
    Object.entries(vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val)
    })
    root.setAttribute('data-density', density)
  }, [density])

  return (
    <DensityContext.Provider value={{ density }}>
      {children}
    </DensityContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDensity(): DensityContextValue {
  return useContext(DensityContext)
}
