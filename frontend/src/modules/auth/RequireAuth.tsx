import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../../shared/components/ui.tsx'
import type { UserRole } from '../../shared/api/client.ts'
import { useAuth } from './use-auth.ts'

export function RequireAuth({
  children,
  role,
  roles,
}: {
  children: ReactNode
  role?: UserRole
  roles?: UserRole[]
}) {
  const { status, user } = useAuth()
  const location = useLocation()
  const allowed = roles ?? (role ? [role] : null)

  if (status === 'loading') {
    return <div className="page-center"><Spinner /></div>
  }

  if (!user) {
    const loginPath = location.pathname.startsWith('/admin') ? '/empresa' : '/ingresar'
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  if (allowed && !allowed.includes(user.role)) {
    return (
      <div className="page narrow">
        <div className="empty">
          <h2>No tienes acceso a esta sección</h2>
          <p>Tu rol actual es {user.role}.</p>
        </div>
      </div>
    )
  }

  return children
}
