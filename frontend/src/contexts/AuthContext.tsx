import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login, logout, isAuthenticated, getAuthUser } from '@/lib/pocketbase'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  loginFn: (email: string, password: string) => Promise<void>
  logoutFn: () => void
  authenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth on mount
    if (isAuthenticated()) {
      setUser(getAuthUser())
    }
    setIsLoading(false)
  }, [])

  const loginFn = useCallback(async (email: string, password: string) => {
    await login(email, password)
    setUser(getAuthUser())
  }, [])

  const logoutFn = useCallback(() => {
    logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, loginFn, logoutFn, authenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
