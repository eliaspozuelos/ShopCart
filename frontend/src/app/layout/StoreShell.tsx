import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from './Footer.tsx'
import { Header } from './Header.tsx'
import { MiniCart } from './MiniCart.tsx'

export function StoreShell() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="page-shell">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <MiniCart />
    </div>
  )
}
