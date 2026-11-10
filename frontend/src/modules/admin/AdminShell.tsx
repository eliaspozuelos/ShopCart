import {
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  Ticket,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../../shared/api/client.ts'
import { useToast } from '../../shared/components/use-toast.ts'
import { useAuth } from '../auth/use-auth.ts'

const links = [
  { to: '/admin', label: 'Reportes', end: true, admin: true, icon: LayoutDashboard },
  { to: '/admin/catalogo', label: 'Catálogo', end: false, admin: true, icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', end: false, admin: false, icon: ShoppingBag },
  { to: '/admin/inventario', label: 'Inventario', end: false, admin: false, icon: Warehouse },
  { to: '/admin/cupones', label: 'Cupones', end: false, admin: true, icon: Ticket },
  { to: '/admin/usuarios', label: 'Usuarios', end: false, admin: true, icon: Users },
  { to: '/admin/bitacora', label: 'Bitácora', end: false, admin: true, icon: ScrollText },
  { to: '/admin/configuracion', label: 'Configuración', end: false, admin: true, icon: Settings },
  { to: '/admin/perfil', label: 'Perfil', end: false, admin: false, icon: UserRound },
]

export function AdminShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [leaving, setLeaving] = useState(false)
  const isAdmin = user?.role === 'Administrador'
  const visible = links.filter((link) => isAdmin || !link.admin)
  const current = visible.find((link) => link.to !== '/admin' && (location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)))
    ?? visible.find((link) => link.to === '/admin')

  async function leave() {
    setLeaving(true)
    try {
      await logout()
      navigate('/empresa')
    } catch (caught) {
      toast.error(errorMessage(caught))
      setLeaving(false)
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <p className="admin-brand">ShopCart</p>
        <p className="admin-role">{user?.name}</p>
        <p className="admin-role">{user?.role}</p>
        <nav>
          {visible.map((link) => {
            const Icon = link.icon
            return (
              <NavLink key={link.to} to={link.to} end={link.end}>
                <Icon />
                {link.label}
              </NavLink>
            )
          })}
        </nav>
        <button className="admin-logout" type="button" disabled={leaving} onClick={() => void leave()}>
          <LogOut />
          Cerrar sesión
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <p>Inicio <span>/</span> {current?.label ?? 'Panel'}</p>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
