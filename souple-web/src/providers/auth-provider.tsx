'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, setAccessToken, setOrganizationId, ApiError } from '@/lib/api-client'

export interface AuthUser {
  id: number
  phone: string
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

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: { phone?: string; email?: string; otpCode?: string; password?: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'souple-access-token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me() as { success: true; data: AuthUser }
      setUser(res.data)
    } catch {
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      setAccessToken(null)
    }
  }, [])

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
    otpCode?: string
    password?: string
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
    setUser(loggedInUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout errors — clear session regardless
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setAccessToken(null)
      setOrganizationId(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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
