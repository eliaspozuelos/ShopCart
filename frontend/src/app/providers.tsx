import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '../shared/components/toast.tsx'
import { AuthProvider } from '../modules/auth/auth-context.tsx'
import { CartProvider } from '../modules/cart/cart-context.tsx'
import { CatalogProvider } from '../modules/catalog/catalog-context.tsx'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CatalogProvider>
            <CartProvider>{children}</CartProvider>
          </CatalogProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
