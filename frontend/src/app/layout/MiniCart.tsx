import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../shared/api/client.ts'
import { Minus, Plus, ShoppingCart, Trash, X } from 'lucide-react'
import { useToast } from '../../shared/components/use-toast.ts'
import { useAuth } from '../../modules/auth/use-auth.ts'
import { ProductImage } from '../../modules/catalog/components/ProductCard.tsx'
import { useCart } from '../../modules/cart/use-cart.ts'

export function MiniCart() {
  const cart = useCart()
  const auth = useAuth()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>, success: string) {
    setPending(true)
    try {
      await action()
      if (success) toast.success(success)
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (!cart.isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') cart.closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [cart, cart.isOpen])

  if (!cart.isOpen) return null
  const data = cart.cart

  return (
    <div className="drawer-root">
      <button type="button" className="drawer-backdrop" aria-label="Cerrar carrito" onClick={cart.closeCart} />
      <aside className="drawer" role="dialog" aria-label="Carrito">
        <header>
          <h2>Carrito</h2>
          <button type="button" aria-label="Cerrar" onClick={cart.closeCart}><X /></button>
        </header>
        <div className="drawer-body">
          {!data || data.items.length === 0 ? (
            <div className="drawer-empty">
              <ShoppingCart />
              <p>Tu carrito está vacío</p>
              <p className="muted">Te ayudamos a encontrar un producto.</p>
              <Link className="btn drawer-shop" to="/tienda" onClick={cart.closeCart}>Ver tienda</Link>
            </div>
          ) : (
            <ul>
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link to={`/producto/${item.productId}`} onClick={cart.closeCart}>
                    <ProductImage src={item.image} alt="" />
                  </Link>
                  <div>
                    <strong>{item.productName}</strong>
                    <span className="muted">{item.priceDisplay} c/u</span>
                    <div className="drawer-line-actions">
                      <div className="qty">
                        <button
                          type="button"
                          aria-label="Quitar una unidad"
                          disabled={pending || item.quantity <= 1}
                          onClick={() => void run(() => cart.updateItem(item.id, item.quantity - 1), '')}
                        >
                          <Minus />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Agregar una unidad"
                          disabled={pending || item.quantity >= item.availableStock}
                          onClick={() => void run(() => cart.updateItem(item.id, item.quantity + 1), '')}
                        >
                          <Plus />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="drawer-remove"
                        aria-label={`Eliminar ${item.productName}`}
                        disabled={pending}
                        onClick={() => void run(() => cart.removeItem(item.id), 'Producto eliminado.')}
                      >
                        <Trash />
                      </button>
                    </div>
                  </div>
                  <em>{item.lineTotalDisplay}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer>
          <p className="drawer-subtotal">
            <span>Subtotal</span>
            <strong>{data?.totals.subtotalDisplay ?? 'Q 0.00'}</strong>
          </p>
          <div className="drawer-actions">
            <Link className="btn drawer-view" to="/carrito" onClick={cart.closeCart}>Ver carrito</Link>
            {!auth.user || auth.user.role === 'Cliente' ? (
              <Link className="btn drawer-pay" to="/carrito" onClick={cart.closeCart}>Pagar</Link>
            ) : null}
            {auth.user && auth.user.role !== 'Cliente' ? (
              <button type="button" className="btn drawer-pay" disabled>Pagar</button>
            ) : null}
          </div>
          {auth.user && auth.user.role !== 'Cliente' ? (
            <p className="muted">El pago es para cuentas de cliente.</p>
          ) : null}
        </footer>
      </aside>
    </div>
  )
}
