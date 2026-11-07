import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { registerUnauthorizedHandler, type User } from '../../shared/api/client.ts'
import * as authApi from './auth.api.ts'
import { AuthContext, type AuthContextValue } from './use-auth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    registerUnauthorizedHandler(async () => {
      const session = await authApi.refreshSession()
      setUser(session?.user ?? null)
      return session !== null
    })

    let active = true
    void authApi.refreshSession().then((session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setStatus('ready')
    })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    async login(email, password) {
      const session = await authApi.login({ email, password })
      setUser(session.user)
      return session.user
    },
    async register(input) {
      await authApi.register(input)
      const session = await authApi.login({ email: input.email, password: input.password })
      setUser(session.user)
      return session.user
    },
    async logout() {
      await authApi.logout()
      setUser(null)
    },
    async changePassword(currentPassword, newPassword) {
      await authApi.changePassword({ currentPassword, newPassword })
      setUser(null)
    },
  }), [status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
