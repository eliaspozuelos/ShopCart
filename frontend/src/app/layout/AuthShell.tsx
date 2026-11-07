import { Outlet } from 'react-router-dom'

export function AuthShell() {
  return (
    <div className="auth-shell">
      <p className="auth-brand">ShopCart</p>
      <Outlet />
    </div>
  )
}
