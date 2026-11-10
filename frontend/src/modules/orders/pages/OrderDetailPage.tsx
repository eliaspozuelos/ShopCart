import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { Spinner } from '../../../shared/components/ui.tsx'
import { formatDate, money, roundMoney } from '../../../shared/lib/money.ts'
import { useAuth } from '../../auth/use-auth.ts'
import { cancelOrder, changeOrderStatus, createReturn, getOrder, resolveReturn } from '../orders.api.ts'
import { OrderTracker } from '../components/OrderTracker.tsx'
import { nextStatuses, paymentLabel, statusLabel } from '../labels.ts'
import type { OrderDetail } from '../orders.types.ts'

interface DetailResult {
  id: number
  detail: OrderDetail | null
  error: string | null
}

const returnStatusLabels: Record<string, string> = {
  SOLICITADA: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
}

export function OrderDetailPage() {
  const params = useParams()
  const location = useLocation()
  const auth = useAuth()
  const toast = useToast()
  const orderId = Number(params.orderId)
  const [result, setResult] = useState<DetailResult | null>(null)
  const [pending, setPending] = useState(false)
  const [reason, setReason] = useState('')
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const placed = typeof location.state === 'object' && location.state !== null && 'placed' in location.state
  const staff = auth.user?.role === 'Operador' || auth.user?.role === 'Administrador'

  async function load() {
    const next = await getOrder(orderId)
    setResult({ id: orderId, detail: next, error: null })
    const initial: Record<number, number> = {}
    next.lines.forEach((line) => {
      initial[line.id] = 0
    })
    setQuantities(initial)
  }

  useEffect(() => {
    let active = true
    void getOrder(orderId)
      .then((next) => {
        if (!active) return
        setResult({ id: orderId, detail: next, error: null })
        const initial: Record<number, number> = {}
        next.lines.forEach((line) => {
          initial[line.id] = 0
        })
        setQuantities(initial)
      })
      .catch((caught: unknown) => {
        if (active) setResult({ id: orderId, detail: null, error: errorMessage(caught) })
      })
    return () => {
      active = false
    }
  }, [orderId])

  const detail = result?.id === orderId ? result.detail : null
  const error = result?.id === orderId ? result.error : null
  const loading = result?.id !== orderId

  async function updateStatus(status: string) {
    setPending(true)
    try {
      await changeOrderStatus(orderId, status)
      await load()
      toast.success('Estado actualizado.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function submitReturn(event: FormEvent) {
    event.preventDefault()
    if (!detail) return
    const items = detail.lines.flatMap((line) => {
      const quantity = quantities[line.id] ?? 0
      if (quantity < 1) return []
      const pendingUnits = detail.returns
        .filter((entry) => entry.status === 'SOLICITADA')
        .flatMap((entry) => entry.items)
        .filter((item) => item.orderDetailId === line.id)
        .reduce((sum, item) => sum + item.quantity, 0)
      const soldRemaining = line.quantity - line.returnedQuantity
      const available = soldRemaining - pendingUnits
      const unit = line.quantity === 0 ? 0 : line.lineTotal / line.quantity
      const amount = quantity === available && pendingUnits === 0
        ? roundMoney(line.lineTotal - unit * line.returnedQuantity)
        : roundMoney(unit * quantity)
      return [{ orderDetailId: line.id, quantity, amount }]
    })
    setPending(true)
    try {
      await createReturn(orderId, { reason, items })
      setReason('')
      await load()
      toast.success('Solicitud enviada. El operador la revisa antes de reintegrar el inventario.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function cancel() {
    if (!window.confirm('¿Cancelar este pedido? No se va a entregar y la existencia vuelve a la tienda.')) return
    setPending(true)
    try {
      await cancelOrder(orderId)
      await load()
      toast.success('Pedido cancelado.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function resolve(returnId: number, decision: 'APROBAR' | 'RECHAZAR') {
    setPending(true)
    try {
      await resolveReturn(orderId, returnId, decision)
      await load()
      toast.success(decision === 'APROBAR' ? 'Devolución aprobada.' : 'Solicitud rechazada.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>
  if (error || !detail) {
    return (
      <div className="page narrow">
        <div className="empty">
          <h2>No se encontró el pedido</h2>
          <p>{error}</p>
          <Link className="btn" to="/pedidos">Volver a pedidos</Link>
        </div>
      </div>
    )
  }

  const { order, lines, returns } = detail
  const returnable = order.status === 'ENTREGADO' || order.status === 'DEVUELTO'
  const canCancel = !staff && order.status === 'CONFIRMADO'

  function requestedQuantity(lineId: number) {
    return returns
      .filter((entry) => entry.status === 'SOLICITADA')
      .flatMap((entry) => entry.items)
      .filter((item) => item.orderDetailId === lineId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to={location.pathname.startsWith('/admin') ? '/admin/pedidos' : '/pedidos'}>Pedidos</Link>
        <span>/</span>{order.number}
      </p>
      {placed ? <p className="notice">Pedido creado. Conserva el número {order.number}.</p> : null}
      <div className="order-head">
        <div>
          <h1>{order.number}</h1>
          <p className="muted">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`badge status-${order.status}`}>{statusLabel(order.status)}</span>
      </div>
      <OrderTracker status={order.status} />
      <div className="split">
        <section className="panel">
          <h2>Productos</h2>
          {lines.map((line) => {
            const pendingUnits = requestedQuantity(line.id)
            const available = line.quantity - line.returnedQuantity - pendingUnits
            return (
              <article key={line.id} className="order-line">
                
                <div>
                  <strong>{line.name}</strong>
                  <p className="muted">SKU {line.sku} · {line.quantity} u. · devueltas {line.returnedQuantity}{pendingUnits > 0 ? ` · en solicitud ${pendingUnits}` : ''}</p>
                </div>
                <strong>{money(line.lineTotal)}</strong>
                {returnable && available > 0 ? (
                  <OutlinedField
                    label="Devolver"
                    type="number"
                    min={0}
                    max={available}
                    value={quantities[line.id] ?? 0}
                    onChange={(value) => {
                      const next = Math.min(available, Math.max(0, Number(value) || 0))
                      setQuantities((current) => ({ ...current, [line.id]: next }))
                    }}
                  />
                ) : null}
              </article>
            )
          })}
        </section>
        <aside className="summary">
          <h2>Totales</h2>
          <p><span>Subtotal</span><strong>{money(order.subtotal)}</strong></p>
          <p><span>Descuento</span><strong>{money(order.discount)}</strong></p>
          {order.tax !== undefined ? <p><span>IVA</span><strong>{money(order.tax)}</strong></p> : null}
          <p className="total"><span>Total</span><strong>{money(order.total)}</strong></p>
          <p><span>Pago</span><strong>{paymentLabel(order.paymentMethod)}</strong></p>
          {order.paymentStatus ? <p><span>Estado del pago</span><strong>{order.paymentStatus}</strong></p> : null}
          {order.couponCode ? <p><span>Cupón</span><strong>{order.couponCode}</strong></p> : null}
          {order.address ? <p className="address-block"><span>Entrega</span><strong>{order.address}</strong></p> : null}
          {canCancel ? (
            <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => void cancel()}>
              Cancelar pedido
            </button>
          ) : null}
          {staff && (nextStatuses[order.status]?.length ?? 0) > 0 ? (
            <div className="status-actions">
              {nextStatuses[order.status]?.map((status) => (
                <button key={status} className="btn btn-ghost" type="button" disabled={pending} onClick={() => void updateStatus(status)}>
                  Marcar {statusLabel(status).toLowerCase()}
                </button>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
      {returns.length > 0 ? (
        <section className="panel return-form">
          <h2>Solicitudes de devolución</h2>
          {returns.map((entry) => (
            <article key={entry.id} className="return-request">
              <div>
                <strong>{returnStatusLabels[entry.status] ?? entry.status}</strong>
                <p className="muted">{entry.reason}</p>
                <p>{entry.items.map((item) => `${item.name} · ${item.quantity} u.`).join(' ')}</p>
              </div>
              {staff && entry.status === 'SOLICITADA' ? (
                <div className="status-actions">
                  <button className="btn" type="button" disabled={pending} onClick={() => void resolve(entry.id, 'APROBAR')}>Aprobar</button>
                  <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => void resolve(entry.id, 'RECHAZAR')}>Rechazar</button>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      {returnable && lines.some((line) => line.quantity - line.returnedQuantity - requestedQuantity(line.id) > 0) ? (
        <form className="panel return-form" onSubmit={(event) => void submitReturn(event)}>
          <h2>Solicitar devolución</h2>
          <p className="muted">Indica el motivo y la cantidad. El inventario vuelve cuando el operador aprueba la solicitud.</p>
          <OutlinedField label="Motivo" multiline required minLength={3} maxLength={300} value={reason} onChange={setReason} />
          <button className="btn" type="submit" disabled={pending || reason.trim().length < 3 || !Object.values(quantities).some((quantity) => quantity > 0)}>
            Solicitar devolución
          </button>
        </form>
      ) : null}
    </div>
  )
}
