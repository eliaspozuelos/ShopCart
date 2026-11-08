import { useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, Search, ShoppingCart, User } from 'lucide-react'
import { errorMessage } from '../../shared/api/client.ts'
import { useToast } from '../../shared/components/use-toast.ts'
import { useAuth } from '../../modules/auth/use-auth.ts'
import { useCart } from '../../modules/cart/use-cart.ts'
import { useCatalog } from '../../modules/catalog/use-catalog.ts'

export function Header() {
  const auth = useAuth()
  const cart = useCart()
  const catalog = useCatalog()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const paramTerm = params.get('q') ?? ''
  const paramCategory = params.get('categoria') ?? ''
  const [term, setTerm] = useState(paramTerm)
  const [categoryId, setCategoryId] = useState(paramCategory)
  const [searchKey, setSearchKey] = useState(`${paramTerm}|${paramCategory}`)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(location.pathname)
  const nextSearchKey = `${paramTerm}|${paramCategory}`

  if (nextSearchKey !== searchKey) {
    setSearchKey(nextSearchKey)
    setTerm(paramTerm)
    setCategoryId(paramCategory)
  }

  if (location.pathname !== menuPath) {
    setMenuPath(location.pathname)
    setMenuOpen(false)
    setAccountOpen(false)
  }

  function search(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (term.trim()) next.set('q', term.trim())
    if (categoryId) next.set('categoria', categoryId)
    navigate(`/tienda?${next.toString()}`)
  }

  async function logout() {
    try {
      await auth.logout()
      navigate('/')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Precios en quetzales · IVA incluido</span>
          <span>Tarjeta de prueba o contra entrega</span>
        </div>
      </div>
      <div className="header-main">
        <div className="container header-row">
          <Link className="logo" to="/" aria-label="ShopCart inicio">
            <img src="/logo1.svg" alt="ShopCart" className="logo-mark" />
            ShopCart.
          </Link>
          <form className="search" onSubmit={search}>
            <select aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Todas las categorías</option>
              {catalog.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              value={term}
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              onChange={(event) => setTerm(event.target.value)}
            />
            <button type="submit" aria-label="Buscar"><Search /></button>
          </form>
          <div className="header-actions">
            <div className="account">
              <button type="button" className="icon-button" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}>
                <User />
                <span>{auth.user ? auth.user.name.split(' ')[0] : 'Cuenta'}</span>
              </button>
              {accountOpen ? (
                <div className="account-menu">
                  {auth.user ? (
                    <>
                      {auth.user.role === 'Cliente' ? <Link to="/cuenta">Mi cuenta</Link> : <Link to="/admin/perfil">Mi perfil</Link>}
                      <Link to="/pedidos">Pedidos</Link>
                      {auth.user.role === 'Administrador' || auth.user.role === 'Operador' ? <Link to="/admin">Panel</Link> : null}
                      <button type="button" onClick={() => void logout()}>Cerrar sesión</button>
                    </>
                  ) : (
                    <>
                      <Link to="/ingresar">Ingresar</Link>
                      <Link to="/registro">Crear cuenta</Link>
                    </>
                  )}
                </div>
              ) : null}
            </div>
              <button type="button" className="icon-button" aria-label={`Carrito, ${cart.itemCount} ${cart.itemCount === 1 ? 'producto' : 'productos'}`} onClick={cart.openCart}>
              <ShoppingCart />
              <span>Carrito</span>
              <em>{cart.itemCount}</em>
            </button>
          </div>
        </div>
      </div>
      <nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'}>
        <div className="container nav-inner">
          <button type="button" className="nav-toggle" aria-label="Abrir menú" onClick={() => setMenuOpen((open) => !open)}>
            <Menu />
            Menú
          </button>
          <div className="nav-links">
            <NavLink to="/" end>Inicio</NavLink>
            <NavLink to="/tienda">Tienda</NavLink>
            {auth.user ? <NavLink to="/pedidos">Pedidos</NavLink> : null}
            {auth.user?.role === 'Administrador' || auth.user?.role === 'Operador' ? <NavLink to="/admin">Panel</NavLink> : null}
            {auth.user?.role === 'Cliente' ? <NavLink to="/cuenta">Cuenta</NavLink> : null}
            {auth.user && auth.user.role !== 'Cliente' ? <NavLink to="/admin/perfil">Perfil</NavLink> : null}
            {auth.user ? null : <NavLink to="/ingresar">Ingresar</NavLink>}
          </div>
        </div>
      </nav>
    </header>
  )
}
