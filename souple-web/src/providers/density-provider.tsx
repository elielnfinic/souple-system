'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Density = 'spacious' | 'dense'

// Roles that prefer dense (data-heavy) UIs
const DENSE_ROLES = ['operator', 'ticketer', 'driver', 'admin', 'manager', 'owner']

interface DensityContextValue {
  density: Density
  setDensity: (d: Density) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DensityContext = React.createContext<DensityContextValue | null>(null)

const DENSITY_KEY = 'souple-ui-density'

// ─── Provider ─────────────────────────────────────────────────────────────────

interface DensityProviderProps {
  children: React.ReactNode
  /** Optionally seed density from user role on first render */
  defaultRole?: string
  className?: string
}

export function DensityProvider({ children, defaultRole, className }: DensityProviderProps) {
  const [density, setDensityState] = React.useState<Density>(() => {
    // On server we can't read localStorage — default to role-based or spacious
    if (typeof window === 'undefined') {
      return defaultRole && DENSE_ROLES.includes(defaultRole) ? 'dense' : 'spacious'
    }
    const stored = localStorage.getItem(DENSITY_KEY) as Density | null
    if (stored === 'spacious' || stored === 'dense') return stored
    return defaultRole && DENSE_ROLES.includes(defaultRole) ? 'dense' : 'spacious'
  })

  const setDensity = React.useCallback((d: Density) => {
    setDensityState(d)
    if (typeof window !== 'undefined') {
      localStorage.setItem(DENSITY_KEY, d)
    }
  }, [])

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      <div
        className={cn(
          density === 'dense' ? 'density-dense' : 'density-spacious',
          className
        )}
      >
        {children}
      </div>
    </DensityContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDensity(): DensityContextValue {
  const ctx = React.useContext(DensityContext)
  if (!ctx) throw new Error('useDensity must be used within <DensityProvider>')
  return ctx
}
