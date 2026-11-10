import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EChartsCoreOption } from 'echarts/core'
import { BadgeDollarSign, ClipboardList, PackageX, Receipt, RotateCcw, ShoppingBag, ShoppingCart, TriangleAlert } from 'lucide-react'
import { errorMessage } from '../../../shared/api/client.ts'
import { formatDate, money } from '../../../shared/lib/money.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { PageHeader, Spinner } from '../../../shared/components/ui.tsx'
import { paymentLabel, statusLabel } from '../../orders/labels.ts'
import { listOrders } from '../../orders/orders.api.ts'
import type { OrderSummary } from '../../orders/orders.types.ts'
import { downloadDashboard, getDashboard, type Dashboard } from '../admin.api.ts'
import { ReportChart } from '../components/ReportChart.tsx'

export function DashboardPage() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [preset, setPreset] = useState('30')
  const [report, setReport] = useState<Dashboard | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadRange(start: string, end: string) {
    setLoading(true)
    setError(null)
    try {
      setReport(await getDashboard(startOfDay(start), endOfDay(end)))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  async function exportReport() {
    setExporting(true)
    setError(null)
    try {
      await downloadDashboard(startOfDay(from), endOfDay(to))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setExporting(false)
    }
  }

  function load(event?: FormEvent) {
    event?.preventDefault()
    setPreset('')
    void loadRange(from, to)
  }

  function applyPreset(days: number) {
    const start = daysAgo(days === 0 ? 0 : days - 1)
    const end = daysAgo(0)
    setFrom(start)
    setTo(end)
    setPreset(String(days))
    void loadRange(start, end)
  }

  useEffect(() => {
    let active = true
    void getDashboard(startOfDay(daysAgo(29)), endOfDay(daysAgo(0)))
      .then((data) => {
        if (active) setReport(data)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    void listOrders({ page: 1, pageSize: 6 })
      .then((page) => {
        if (active) setOrders(page.orders)
      })
      .catch(() => {
        if (active) setOrders([])
      })
    return () => {
      active = false
    }
  }, [])

  const salesOption = useMemo(() => (report ? salesChart(report) : null), [report])
  const categoryOption = useMemo(() => (report ? categoryChart(report) : null), [report])
  const productOption = useMemo(() => (report ? productChart(report) : null), [report])
  const statusOption = useMemo(() => (report ? statusChart(report) : null), [report])

  return (
    <div className="admin-page">
      <PageHeader title="Reportes" subtitle="Ventas del periodo, pedidos por atender y existencia." />
      <div className="period-pills" aria-label="Periodo">
        {presets.map((item) => (
          <button key={item.days} type="button" className={preset === String(item.days) ? 'is-active' : ''} onClick={() => applyPreset(item.days)}>
            {item.label}
          </button>
        ))}
      </div>
      <form className="inline-actions" onSubmit={load}>
        <OutlinedField label="Desde" type="date" value={from} onChange={setFrom} />
        <OutlinedField label="Hasta" type="date" value={to} onChange={setTo} />
        <button className="btn" type="submit">Actualizar</button>
        <button className="btn btn-ghost" type="button" disabled={exporting || loading} onClick={() => void exportReport()}>
          {exporting ? 'Exportando…' : 'Exportar a Excel'}
        </button>
      </form>
      {loading ? <div className="page-center"><Spinner /></div> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {report && !loading ? (
        <>
          <section className="stat-grid">
            <Kpi tone="blue" icon={<ShoppingBag />} label="Pedidos" value={report.summary.orders} />
            <Kpi tone="red" icon={<BadgeDollarSign />} label="Ventas" value={money(report.summary.sales)} />
            <Kpi tone="green" icon={<Receipt />} label="Ticket promedio" value={money(report.summary.averageTicket)} />
            <Kpi tone="amber" icon={<ClipboardList />} label="Por atender" value={attentionTotal(report)} detail={`Confirmado ${report.attention.confirmed} · En ruta ${report.attention.onRoute}`} />
          </section>
          <section className="stat-grid">
            <Kpi tone="red" icon={<PackageX />} label="Cancelados" value={report.losses.cancelledOrders} detail={`${money(report.losses.cancelledAmount)} en el periodo`} />
            <Kpi tone="amber" icon={<RotateCcw />} label="Devuelto" value={money(report.losses.returnedAmount)} detail={report.losses.returnedOrders === 1 ? '1 pedido con reintegro' : `${report.losses.returnedOrders} pedidos con reintegro`} />
            <Kpi tone="blue" icon={<TriangleAlert />} label="Existencia baja" value={report.lowStockCount} detail={`${report.lowStockThreshold} unidades o menos`} />
            <Kpi tone="green" icon={<ShoppingCart />} label="Carritos abandonados" value={report.abandonedCarts} detail={`${report.inactiveMinutes} min sin actividad`} />
          </section>
          <section className="panel">
            <h2>Existencia por reponer</h2>
            {report.lowStockItems.length === 0 ? (
              <p className="muted">Ninguna variante activa está en {report.lowStockThreshold} unidades o menos.</p>
            ) : (
              <div className="stock-table">
                <table className="data-table">
                  <thead><tr><th>Producto</th><th>SKU</th><th>Existencia</th></tr></thead>
                  <tbody>
                    {report.lowStockItems.map((item) => (
                      <tr key={item.sku}>
                        <td>{item.product}</td>
                        <td>{item.sku}</td>
                        <td className={item.stock === 0 ? 'stock-out' : ''}>{item.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div className="admin-grid">
            <section className="panel">
              <h2>Ventas por día</h2>
              {salesOption ? <ReportChart option={salesOption} label="Ventas por día" /> : <p className="muted">Sin ventas en el periodo.</p>}
            </section>
            <section className="panel">
              <h2>Por categoría</h2>
              {categoryOption ? <ReportChart option={categoryOption} label="Ventas por categoría" /> : <p className="muted">Sin ventas por categoría.</p>}
            </section>
          </div>
          <div className="admin-grid">
            <section className="panel">
              <h2>Top productos</h2>
              {productOption ? <ReportChart option={productOption} label="Productos más vendidos" /> : <p className="muted">Sin productos vendidos.</p>}
            </section>
            <section className="panel">
              <h2>Estados</h2>
              {statusOption ? <ReportChart option={statusOption} label="Pedidos por estado" /> : <p className="muted">Sin pedidos en el periodo.</p>}
            </section>
          </div>
          <section className="panel">
            <div className="section-head">
              <h2>Pedidos recientes</h2>
              <Link to="/admin/pedidos">Ver todos</Link>
            </div>
            {orders.length === 0 ? <p className="muted">No hay pedidos para mostrar.</p> : (
              <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>Pedido</th><th>Estado</th><th>Fecha</th><th>Total</th><th>Pago</th></tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td><Link to={`/admin/pedidos/${order.id}`}>{order.number}</Link></td>
                      <td><span className={`order-status ${statusTone(order.status)}`}>{statusLabel(order.status)}</span></td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{money(order.total)}</td>
                      <td>{paymentLabel(order.paymentMethod)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

const presets = [
  { days: 0, label: 'Hoy' },
  { days: 7, label: '7 días' },
  { days: 15, label: '15 días' },
  { days: 30, label: '30 días' },
]

function Kpi({ tone, icon, label, value, detail }: { tone: string; icon: ReactNode; label: string; value: ReactNode; detail?: string }) {
  return (
    <article className="kpi">
      <span className={`kpi-icon ${tone}`}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  )
}

function attentionTotal(report: Dashboard): number {
  return report.attention.confirmed + report.attention.preparing + report.attention.dispatched + report.attention.onRoute
}

function statusTone(status: string): string {
  if (status === 'ENTREGADO') return 'is-done'
  if (status === 'CANCELADO' || status === 'DEVUELTO') return 'is-bad'
  if (status === 'PREPARANDO' || status === 'DESPACHADO' || status === 'EN_RUTA') return 'is-wait'
  return ''
}

const chartColors = ['#055494', '#e22b23', '#1f7a4d', '#e09f3e', '#5c6bc0', '#00838f', '#8d6e63']

function salesChart(report: Dashboard): EChartsCoreOption | null {
  if (report.salesByDay.length === 0) return null
  return {
    color: ['#055494'],
    textStyle: { fontFamily: 'Jost, "Segoe UI", sans-serif' },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => quetzales(value) },
    grid: { left: 72, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: report.salesByDay.map((point) => shortDate(point.period)),
      axisLabel: { color: '#7e7e80' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#7e7e80', formatter: (value: number) => money(value) },
    },
    series: [{
      type: 'line',
      name: 'Ventas',
      smooth: true,
      showSymbol: report.salesByDay.length < 15,
      areaStyle: { color: 'rgba(5, 84, 148, 0.12)' },
      data: report.salesByDay.map((point) => point.sales),
    }],
  }
}

function categoryChart(report: Dashboard): EChartsCoreOption | null {
  if (report.salesByCategory.length === 0) return null
  return {
    color: chartColors,
    textStyle: { fontFamily: 'Jost, "Segoe UI", sans-serif' },
    tooltip: {
      trigger: 'item',
      formatter: (item: unknown) => {
        const point = one(item)
        const row = report.salesByCategory.find((category) => category.category === point.name)
        return `${point.name}<br/>${quetzales(point.value)} · ${row?.units ?? 0} unidades`
      },
    },
    legend: { type: 'scroll', bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['50%', '44%'],
      label: { show: false },
      data: report.salesByCategory.map((item) => ({ name: item.category, value: item.sales })),
    }],
  }
}

function productChart(report: Dashboard): EChartsCoreOption | null {
  if (report.topProducts.length === 0) return null
  const products = [...report.topProducts].reverse()
  return {
    color: ['#055494'],
    textStyle: { fontFamily: 'Jost, "Segoe UI", sans-serif' },
    tooltip: {
      trigger: 'axis',
      formatter: (item: unknown) => {
        const point = one(item)
        const row = report.topProducts.find((product) => product.name === point.name)
        return `${point.name}<br/>${row?.sku ?? ''}<br/>${row?.units ?? 0} unidades · ${quetzales(point.value)}`
      },
    },
    grid: { left: 16, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#7e7e80', formatter: (value: number) => money(value) } },
    yAxis: {
      type: 'category',
      data: products.map((item) => item.name),
      axisLabel: { color: '#1c1c1c', width: 240, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      name: 'Ventas',
      data: products.map((item) => item.sales),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
  }
}

function statusChart(report: Dashboard): EChartsCoreOption | null {
  if (report.statuses.length === 0) return null
  return {
    color: chartColors,
    textStyle: { fontFamily: 'Jost, "Segoe UI", sans-serif' },
    tooltip: { trigger: 'item', valueFormatter: (value: unknown) => `${amount(value)} pedidos` },
    legend: { type: 'scroll', bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['50%', '44%'],
      label: { show: false },
      data: report.statuses.map((item) => ({ name: statusLabel(item.status), value: item.count })),
    }],
  }
}

function one(item: unknown): { name?: string; value?: unknown } {
  return (Array.isArray(item) ? item[0] : item) as { name?: string; value?: unknown }
}

function quetzales(value: unknown): string {
  return money(amount(value))
}

function amount(value: unknown): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(parsed) ? parsed : 0
}

function shortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' }).format(date)
}

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function startOfDay(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString()
}

function endOfDay(value: string): string {
  return new Date(`${value}T23:59:59`).toISOString()
}
