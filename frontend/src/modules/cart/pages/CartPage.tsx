import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { Minus, Plus, Trash } from 'lucide-react'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { EmptyState, PageHeader, Spinner } from '../../../shared/components/ui.tsx'
import { useAuth } from '../../auth/use-auth.ts'
import { ProductImage } from '../../catalog/components/ProductCard.tsx'
import { useCart } from '../use-cart.ts'

export function CartPage() {
  const cart = useCart()
  const auth = useAuth()
  const toast = useToast()
  const [coupon, setCoupon] = useState('')
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

  function applyCoupon(event: FormEvent) {
    event.preventDefault()
    void run(() => cart.applyCoupon(coupon), 'Cupón aplicado.')
  }

  const data = cart.cart
  const symbol = data?.currencySymbol ?? 'Q'

  return (
    <div className="page">
      <PageHeader title="Carrito" subtitle="Los precios incluyen IVA. La reserva de existencia dura 15 minutos." />
      {cart.error ? <p className="form-error">{cart.error}</p> : null}
      {cart.status === 'loading' ? <div className="page-center"><Spinner /></div> : null}
      {cart.status !== 'loading' && (!data || data.items.length === 0) ? (
        <EmptyState
          title="Tu carrito está vacío"
          message="Agrega un producto de la tienda para continuar."
          action={<Link className="btn" to="/tienda">Ir a la tienda</Link>}
        />
      ) : null}
      {cart.status !== 'loading' && data && data.items.length > 0 ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {data.items.map((item) => (
              <article key={item.id} className="cart-line">
                <Link to={`/producto/${item.productId}`} className="line-media">
                  <ProductImage src={item.image} alt="" />
                </Link>
                <div>
                  <h2><Link to={`/producto/${item.productId}`}>{item.productName}</Link></h2>
                  <p className="muted">
                    {item.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(' · ') || item.sku}
                  </p>
                  <p className="muted">SKU {item.sku}</p>
                  {item.quantity > item.availableStock ? (
                    <p className="form-error">Solo hay {item.availableStock} disponibles.</p>
                  ) : null}
                  <div className="line-actions">
                    <div className="qty">
                      <button type="button" aria-label="Quitar una unidad" disabled={pending || item.quantity <= 1} onClick={() => void run(() => cart.updateItem(item.id, item.quantity - 1), '')}><Minus /></button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Agregar una unidad" disabled={pending || item.quantity >= item.availableStock} onClick={() => void run(() => cart.updateItem(item.id, item.quantity + 1), '')}><Plus /></button>
                    </div>
                    <button type="button" className="icon-action" aria-label={`Eliminar ${item.productName}`} disabled={pending} onClick={() => void run(() => cart.removeItem(item.id), 'Producto eliminado.')}>
                      <Trash />
                    </button>
                  </div>
                </div>
                <strong>{item.lineTotalDisplay || `${symbol} ${item.lineTotal.toFixed(2)}`}</strong>
              </article>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={pending}
              onClick={() => {
                if (window.confirm('¿Vaciar el carrito?')) void run(() => cart.clearCart(), 'El carrito quedó vacío.')
              }}
            >
              Vaciar carrito
            </button>
          </div>
          <aside className="summary">
            <h2>Resumen</h2>
            <p><span>Subtotal</span><strong>{data.totals.subtotalDisplay}</strong></p>
            <p><span>Descuento</span><strong>{data.totals.discountDisplay}</strong></p>
            <p className="total"><span>Total</span><strong>{data.totals.totalDisplay}</strong></p>
            {data.coupon ? (
              <div className="coupon-note">
                <span>Cupón {data.coupon.code}</span>
                <button type="button" className="text-button" disabled={pending} onClick={() => void run(() => cart.removeCoupon(), 'Cupón quitado.')}>
                  Quitar
                </button>
              </div>
            ) : (
              <form className="coupon-form" onSubmit={applyCoupon}>
                <OutlinedField label="Código de cupón" value={coupon} onChange={setCoupon} />
                <button className="btn btn-ghost" type="submit" disabled={pending || coupon.trim() === ''}>Aplicar</button>
              </form>
            )}
            <CheckoutLink role={auth.user?.role} signedIn={Boolean(auth.user)} />
          </aside>
        </div>
      ) : null}
    </div>
  )
}

function CheckoutLink({ role, signedIn }: { role?: string; signedIn: boolean }) {
  if (!signedIn) {
    return <Link className="btn" to="/ingresar" state={{ from: '/checkout' }}>Ingresar para pagar</Link>
  }
  if (role !== 'Cliente') {
    return <p className="muted">El pago está disponible para cuentas de cliente.</p>
  }
  return <Link className="btn" to="/checkout">Continuar al pago</Link>
}
