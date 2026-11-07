import { createContext, useContext } from 'react'
import type { User } from '../../shared/api/client.ts'

export interface AuthContextValue {
  status: 'loading' | 'ready'
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (input: { email: string; password: string; name: string }) => Promise<User>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}
