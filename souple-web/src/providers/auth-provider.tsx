'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { authApi, setAccessToken, setOrganizationId, ApiError } from '@/lib/api-client'

export interface AuthUser {
  id: number
  phone: string | null
  email: string | null
  firstName: string
  lastName: string
  fullName: string
  avatarUrl: string | null
  locale: string
  timezone: string
  isSuperAdmin: boolean
  isActive: boolean
  memberships?: Array<{
    organizationId: number
    role: string
    organization: {
      id: number
      name: string
      slug: string
      type: string
    }
  }>
}

export type Membership = NonNullable<AuthUser['memberships']>[0]

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  activeOrg: Membership | null
  setActiveOrg: (org: Membership) => void
  login: (data: { phone?: string; email?: string; password?: string; otpCode?: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'souple-access-token'
const ORG_KEY = 'souple-active-org-id'

function pickOrg(memberships: Membership[] | undefined, savedId: number | null): Membership | null {
  if (!memberships || memberships.length === 0) return null
  if (savedId) {
    const found = memberships.find((m) => m.organizationId === savedId)
    if (found) return found
  }
  return memberships[0] ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeOrg, setActiveOrgState] = useState<Membership | null>(null)
  const timezoneChecked = useRef(false)

  // Set active org and sync both localStorage + the API client header
  const setActiveOrg = useCallback((org: Membership) => {
    setActiveOrgState(org)
    setOrganizationId(org.organizationId)
    localStorage.setItem(ORG_KEY, String(org.organizationId))
  }, [])

  const applyUser = useCallback((u: AuthUser) => {
    setUser(u)
    // Pick the previously selected org or fall back to the first one
    const savedId = Number(localStorage.getItem(ORG_KEY) ?? '0') || null
    const org = pickOrg(u.memberships, savedId)
    if (org) {
      setActiveOrgState(org)
      setOrganizationId(org.organizationId)
    } else {
      setOrganizationId(null)
    }

    // Silently sync timezone to browser's detected timezone once per session
    if (!timezoneChecked.current && typeof window !== 'undefined') {
      timezoneChecked.current = true
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (browserTz && browserTz !== u.timezone) {
          authApi.updateMe({ timezone: browserTz }).catch(() => {})
        }
      } catch {
        // ignore
      }
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me() as { success: true; data: AuthUser }
      applyUser(res.data)
    } catch {
      setUser(null)
      setActiveOrgState(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ORG_KEY)
      setAccessToken(null)
      setOrganizationId(null)
    }
  }, [applyUser])

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      setAccessToken(token)
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [refreshUser])

  const login = useCallback(async (data: {
    phone?: string
    email?: string
    password?: string
    otpCode?: string
  }) => {
    const res = await authApi.login(data) as {
      success: true
      data: {
        user: AuthUser
        token: { token: string; expiresAt: string }
      }
    }
    const { user: loggedInUser, token } = res.data
    localStorage.setItem(TOKEN_KEY, token.token)
    setAccessToken(token.token)
    applyUser(loggedInUser)
  }, [applyUser])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Clear session regardless of errors
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ORG_KEY)
      setAccessToken(null)
      setOrganizationId(null)
      setUser(null)
      setActiveOrgState(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        activeOrg,
        setActiveOrg,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
