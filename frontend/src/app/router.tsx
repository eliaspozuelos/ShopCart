import { House } from 'lucide-react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { StoreShell } from './layout/StoreShell.tsx'
import { AuthShell } from './layout/AuthShell.tsx'
import { RequireAuth } from '../modules/auth/RequireAuth.tsx'
import { useAuth } from '../modules/auth/use-auth.ts'
import { AdminShell } from '../modules/admin/AdminShell.tsx'
import { AuditPage } from '../modules/admin/pages/AuditPage.tsx'
import { CatalogAdminPage } from '../modules/admin/pages/CatalogAdminPage.tsx'
import { CouponsPage } from '../modules/admin/pages/CouponsPage.tsx'
import { DashboardPage } from '../modules/admin/pages/DashboardPage.tsx'
import { InventoryPage } from '../modules/admin/pages/InventoryPage.tsx'
import { SettingsPage } from '../modules/admin/pages/SettingsPage.tsx'
import { StaffProfilePage } from '../modules/admin/pages/StaffProfilePage.tsx'
import { UsersPage } from '../modules/admin/pages/UsersPage.tsx'
import { LoginPage, RegisterPage, StaffLoginPage } from '../modules/auth/pages/AuthPages.tsx'
import { AccountPage } from '../modules/account/pages/AccountPage.tsx'
import { CartPage } from '../modules/cart/pages/CartPage.tsx'
import { HomePage } from '../modules/catalog/pages/HomePage.tsx'
import { ProductPage } from '../modules/catalog/pages/ProductPage.tsx'
import { ShopPage } from '../modules/catalog/pages/ShopPage.tsx'
import { CheckoutPage } from '../modules/checkout/pages/CheckoutPage.tsx'
import { OrderDetailPage } from '../modules/orders/pages/OrderDetailPage.tsx'
import { OrdersPage } from '../modules/orders/pages/OrdersPage.tsx'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthShell />}>
        <Route path="empresa" element={<StaffLoginPage />} />
      </Route>

      <Route element={<StoreShell />}>
        <Route index element={<HomePage />} />

        {/* Ruta para la página de la tienda */}
        <Route path="tienda" element={<ShopPage />} />
        <Route path="producto/:productId" element={<ProductPage />} />
        <Route path="carrito" element={<CartPage />} />
        <Route path="ingresar" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />

        {/* Rutas protegidas para usuarios autenticados */}
        <Route path="checkout" element={<RequireAuth role="Cliente"><CheckoutPage /></RequireAuth>} />
        <Route path="cuenta" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="cuenta/:section" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="pedidos" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="pedidos/:orderId" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Rutas protegidas para administradores y operadores */}
      <Route path="admin" element={<RequireAuth roles={['Administrador', 'Operador']}><AdminShell /></RequireAuth>}>
        <Route index element={<AdminIndex />} />
        <Route path="catalogo" element={<RequireAuth roles={['Administrador']}><CatalogAdminPage /></RequireAuth>} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/:orderId" element={<OrderDetailPage />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="cupones" element={<RequireAuth roles={['Administrador']}><CouponsPage /></RequireAuth>} />
        <Route path="usuarios" element={<RequireAuth roles={['Administrador']}><UsersPage /></RequireAuth>} />
        <Route path="bitacora" element={<RequireAuth roles={['Administrador']}><AuditPage /></RequireAuth>} />
        <Route path="configuracion" element={<RequireAuth roles={['Administrador']}><SettingsPage /></RequireAuth>} />
        <Route path="perfil" element={<StaffProfilePage />} />
      </Route>
    </Routes>
  )
}

function AdminIndex() {
  const { user } = useAuth()
  if (user?.role !== 'Administrador') return <Navigate to="/admin/inventario" replace />
  return <DashboardPage />
}

function NotFoundPage() {
  return (
    <div className="page missing">
      <p className="missing-crumb">
        <Link to="/" aria-label="Inicio">
          <House />
        </Link>
        <span aria-hidden="true">›</span>
        La página solicitada no pudo ser encontrada
      </p>
      <div className="missing-body">
        <h1>La página solicitada no pudo ser encontrada</h1>
        <p>La página solicitada no pudo ser encontrada.</p>
        <Link className="btn" to="/">Continuar</Link>
      </div>
    </div>
  )
}
