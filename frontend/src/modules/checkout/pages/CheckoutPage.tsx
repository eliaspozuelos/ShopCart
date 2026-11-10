import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { FormError, PageHeader, Spinner } from '../../../shared/components/ui.tsx'
import { getProfile } from '../../account/account.api.ts'
import type { Address } from '../../account/account.types.ts'
import { useCart } from '../../cart/use-cart.ts'
import { checkout } from '../../orders/orders.api.ts'

export function CheckoutPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'TARJETA' | 'CONTRA_ENTREGA'>('CONTRA_ENTREGA')
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getProfile()
      .then((profile) => {
        if (!active) return
        setAddresses(profile.addresses)
        setAddressId(profile.addresses[0]?.id ?? null)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!addressId) return
    setPending(true)
    setError(null)
    try {
      const order = await checkout({ addressId, paymentMethod, idempotencyKey })
      await cart.reload().catch(() => undefined)
      navigate(`/pedidos/${order.order.id}`, { replace: true, state: { placed: true } })
    } catch (caught) {
      setError(errorMessage(caught))
      setPending(false)
    }
  }

  if (loading || cart.status === 'loading') return <div className="page-center"><Spinner /></div>

  if (!cart.cart || cart.cart.items.length === 0) {
    return (
      <div className="page narrow">
        <div className="empty">
          <h2>No hay productos para pagar</h2>
          <Link className="btn" to="/tienda">Ir a la tienda</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page checkout-page">
      <PageHeader
        title="Pago"
        subtitle="La tarjeta no guarda número, vencimiento ni CVV. Es un cobro local de prueba."
      />
      <form className="checkout-layout" onSubmit={(event) => void submit(event)}>
        <div className="panel">
          <h2>Dirección de entrega</h2>
          {addresses.length === 0 ? (
            <p>Necesitas una dirección antes de pagar. <Link to="/cuenta/direcciones">Agregarla en mi cuenta</Link></p>
          ) : (
            addresses.map((address) => (
              <label key={address.id} className="choice">
                <input
                  type="radio"
                  name="address"
                  checked={addressId === address.id}
                  onChange={() => setAddressId(address.id)}
                />
                <span>
                  <strong>{address.alias}</strong>
                  <small>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</small>
                  <small>{address.municipality}, {address.department} · {address.phone}</small>
                </span>
              </label>
            ))
          )}
          <h2>Método de pago</h2>
          <label className="choice">
            <input type="radio" name="payment" checked={paymentMethod === 'CONTRA_ENTREGA'} onChange={() => setPaymentMethod('CONTRA_ENTREGA')} />
            <span><strong>Contra entrega</strong><small>Pagas cuando recibes el pedido.</small></span>
          </label>
          <label className="choice">
            <input type="radio" name="payment" checked={paymentMethod === 'TARJETA'} onChange={() => setPaymentMethod('TARJETA')} />
            <span><strong>Tarjeta</strong><small>Se registra como pago de prueba, sin datos de tarjeta.</small></span>
          </label>
          <FormError message={error} />
        </div>
        <aside className="summary">
          <h2>Tu pedido</h2>
          {cart.cart.items.map((item) => (
            <p key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{item.lineTotalDisplay}</strong></p>
          ))}
          <p><span>Subtotal</span><strong>{cart.cart.totals.subtotalDisplay}</strong></p>
          <p><span>Descuento</span><strong>{cart.cart.totals.discountDisplay}</strong></p>
          <p className="total"><span>Total</span><strong>{cart.cart.totals.totalDisplay}</strong></p>
          <button className="btn" type="submit" disabled={pending || !addressId}>
            {pending ? 'Procesando...' : 'Confirmar pedido'}
          </button>
        </aside>
      </form>
    </div>
  )
}
