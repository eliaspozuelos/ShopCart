import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { formatDate, money } from '../../../shared/lib/money.ts'
import { EmptyState, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import { useAuth } from '../../auth/use-auth.ts'
import { listOrders } from '../orders.api.ts'
import { OrderTracker } from '../components/OrderTracker.tsx'
import { statusLabel } from '../labels.ts'
import type { OrderSummary } from '../orders.types.ts'
import type { PageInfo } from '../../catalog/catalog.types.ts'

const statuses = ['', 'CONFIRMADO', 'PREPARANDO', 'DESPACHADO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO', 'DEVUELTO']

interface OrdersResult {
  key: string
  orders: OrderSummary[]
  pagination: PageInfo | null
  error: string | null
}

export function OrdersPage() {
  const { user } = useAuth()
  const location = useLocation()
  const ordersBase = location.pathname.startsWith('/admin') ? '/admin/pedidos' : '/pedidos'
  const [params, setParams] = useSearchParams()
  const status = params.get('estado') ?? ''
  const customer = params.get('cliente') ?? ''
  const from = params.get('desde') ?? ''
  const to = params.get('hasta') ?? ''
  const page = Math.max(1, Number(params.get('pagina') ?? '1') || 1)
  const queryKey = `${page}|${status}|${customer}|${from}|${to}`
  const staff = user?.role === 'Operador' || user?.role === 'Administrador'
  const [result, setResult] = useState<OrdersResult | null>(null)
  const [customerDraft, setCustomerDraft] = useState(customer)

  useEffect(() => {
    setCustomerDraft(customer)
  }, [customer])

  useEffect(() => {
    if (!staff) return
    const trimmed = customerDraft.trim()
    if (trimmed === customer) return
    const handle = window.setTimeout(() => {
      setParams((current) => {
        const updated = new URLSearchParams(current)
        if (trimmed) updated.set('cliente', trimmed)
        else updated.delete('cliente')
        updated.delete('pagina')
        return updated
      })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [customerDraft, customer, staff, setParams])

  useEffect(() => {
    let active = true
    void listOrders({
      page,
      pageSize: 10,
      status: status || undefined,
      customer: staff ? customer || undefined : undefined,
      from: staff ? dayBound(from, false) : undefined,
      to: staff ? dayBound(to, true) : undefined,
    })
      .then((pageResult) => {
        if (active) setResult({ key: queryKey, orders: pageResult.orders, pagination: pageResult.pagination, error: null })
      })
      .catch((caught: unknown) => {
        if (active) setResult({ key: queryKey, orders: [], pagination: null, error: errorMessage(caught) })
      })
    return () => {
      active = false
    }
  }, [queryKey, page, status, customer, from, to, staff])

  const orders = result?.key === queryKey ? result.orders : []
  const pagination = result?.key === queryKey ? result.pagination : null
  const error = result?.key === queryKey ? result.error : null
  const loading = result?.key !== queryKey

  function update(next: Record<string, string | null>, keepPage = false) {
    setParams((current) => {
      const updated = new URLSearchParams(current)
      for (const [key, value] of Object.entries(next)) {
        if (!value) updated.delete(key)
        else updated.set(key, value)
      }
      if (!keepPage) updated.delete('pagina')
      return updated
    })
  }

  return (
    <div className={staff ? 'admin-page' : 'page'}>
      <PageHeader
        title={staff ? 'Pedidos' : 'Mis pedidos'}
        subtitle={staff ? 'Todos los pedidos de la tienda, 10 por página.' : 'Consulta el estado de tus compras.'}
      />
      <div className="toolbar order-filters">
        <label>
          Estado
          <select value={status} onChange={(event) => update({ estado: event.target.value || null })}>
            {statuses.map((item) => (
              <option key={item || 'all'} value={item}>{item ? statusLabel(item) : 'Todos'}</option>
            ))}
          </select>
        </label>
        {staff ? (
          <>
            <label className="order-customer">
              Cliente
              <input
                type="search"
                value={customerDraft}
                placeholder="Nombre o correo"
                onChange={(event) => setCustomerDraft(event.target.value)}
              />
            </label>
            <label>
              Desde
              <input type="date" value={from} onChange={(event) => update({ desde: event.target.value || null })} />
            </label>
            <label>
              Hasta
              <input type="date" value={to} onChange={(event) => update({ hasta: event.target.value || null })} />
            </label>
          </>
        ) : null}
      </div>
      {loading ? <div className="page-center"><Spinner /></div> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error && orders.length === 0 ? (
        <EmptyState title="No hay pedidos" message="Cuando se confirme una compra, aparecerá en esta lista." />
      ) : null}
      {!loading && !error && staff && orders.length > 0 ? (
        <section className="panel">
          <div className="table-scroll">
            <table className="data-table order-table">
              <thead>
                <tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th>Total</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.number}</strong></td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <strong>{order.customerName ?? `Cliente ${order.customerId}`}</strong>
                      {order.customerEmail ? <span className="muted order-mail">{order.customerEmail}</span> : null}
                    </td>
                    <td><span className={`badge status-${order.status}`}>{statusLabel(order.status)}</span></td>
                    <td>{money(order.total)}</td>
                    <td><Link to={`${ordersBase}/${order.id}`}>Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination ? (
            <>
              <p className="muted">{orderCount(pagination.total)}</p>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPage={(nextPage) => update({ pagina: String(nextPage) }, true)} />
            </>
          ) : null}
        </section>
      ) : null}
      {!loading && !error && !staff && orders.length > 0 ? (
        <>
          <div className="order-list">
            {orders.map((order) => (
              <Link key={order.id} className="order-row" to={`${ordersBase}/${order.id}`}>
                <div>
                  <strong>{order.number}</strong>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <OrderTracker status={order.status} compact />
                <span className={`badge status-${order.status}`}>{statusLabel(order.status)}</span>
                <strong>{money(order.total)}</strong>
              </Link>
            ))}
          </div>
          {pagination ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPage={(nextPage) => update({ pagina: String(nextPage) }, true)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function orderCount(total: number): string {
  return total === 1 ? '1 pedido' : `${total} pedidos`
}

function dayBound(value: string, end: boolean): string | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  const date = end ? new Date(year, month - 1, day, 23, 59, 59) : new Date(year, month - 1, day, 0, 0, 0)
  return date.toISOString()
}
