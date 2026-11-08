import { House } from 'lucide-react'
import { Link, Route, Routes } from 'react-router-dom'
import { StoreShell } from './layout/StoreShell.tsx'
import { AuthShell } from './layout/AuthShell.tsx'
import { LoginPage, RegisterPage, StaffLoginPage } from '../modules/auth/pages/AuthPages.tsx'
import { CartPage } from '../modules/cart/pages/CartPage.tsx'
import { HomePage } from '../modules/catalog/pages/HomePage.tsx'
import { ProductPage } from '../modules/catalog/pages/ProductPage.tsx'
import { ShopPage } from '../modules/catalog/pages/ShopPage.tsx'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthShell />}>
        <Route path="empresa" element={<StaffLoginPage />} />
      </Route>

      <Route element={<StoreShell />}>
        <Route index element={<HomePage />} />

        {/* Rutas de la tienda y catálogo */}
        <Route path="tienda" element={<ShopPage />} />
        <Route path="producto/:productId" element={<ProductPage />} />
        <Route path="carrito" element={<CartPage />} />
        <Route path="ingresar" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
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
