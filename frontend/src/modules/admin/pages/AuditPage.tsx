import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { errorMessage } from '../../../shared/api/client.ts'
import { formatDate } from '../../../shared/lib/money.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import type { PageInfo } from '../../catalog/catalog.types.ts'
import { getAuditSummary, listAudit, type AuditEntry, type AuditSummary } from '../admin.api.ts'
import { ReportChart } from '../components/ReportChart.tsx'

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<PageInfo | null>(null)
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [moduleName, setModuleName] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [paging, setPaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const requestId = useRef(0)

  function applyPage(result: { entries: AuditEntry[]; pagination: PageInfo }) {
    setEntries(result.entries)
    setPagination(result.pagination)
    setPage(result.pagination.page)
  }

  function load(next: { page?: number; module?: string } = {}) {
    const id = ++requestId.current
    const nextPage = next.page ?? page
    const nextModule = next.module ?? moduleName
    setPaging(true)
    setError(null)
    return listAudit(nextPage, nextModule || undefined)
      .then((result) => {
        if (id === requestId.current) applyPage(result)
      })
      .finally(() => {
        if (id === requestId.current) setPaging(false)
      })
  }

  useEffect(() => {
    let active = true
    const id = ++requestId.current
    void listAudit()
      .then((result) => {
        if (active && id === requestId.current) applyPage(result)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    void getAuditSummary()
      .then((nextSummary) => {
        if (active) setSummary(nextSummary)
      })
      .catch((caught: unknown) => {
        if (active) setChartError(errorMessage(caught))
      })
    return () => {
      active = false
    }
  }, [])

  async function changePage(nextPage: number) {
    try {
      await load({ page: nextPage })
    } catch (caught) {
      setError(errorMessage(caught))
      setPaging(false)
    }
  }

  async function filter(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await load({ page: 1 })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  const dayOption = useMemo(() => (summary ? dayChart(summary) : null), [summary])
  const moduleOption = useMemo(() => (summary ? barChart(summary.byModule, moduleLabel, 'Eventos') : null), [summary])
  const actionOption = useMemo(() => (summary ? barChart(summary.byAction, actionLabel, 'Eventos') : null), [summary])

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Bitácora" subtitle="Registro inmutable de las acciones críticas." />
      <form className="inline-actions" onSubmit={(event) => void filter(event)}>
        <OutlinedField label="Módulo" value={moduleName} onChange={setModuleName} />
        <button className="btn btn-ghost" type="submit">Filtrar</button>
      </form>
      <section className="panel">
        <FormError message={error} />
        <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.createdAt)}</td>
                <td>{entry.email ?? 'Sistema'}</td>
                <td>{moduleLabel(entry.module)}</td>
                <td>{actionLabel(entry.action)}</td>
                <td>{entry.entity} {entry.entityId ?? ''}</td>
                <td className="clip">{entry.next || entry.previous || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {entries.length === 0 ? <p className="muted">No hay eventos para ese filtro.</p> : null}
        {pagination ? (
          <>
            <p className="muted">{paging ? 'Cargando página…' : eventCount(pagination.total)}</p>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} disabled={paging} onPage={(nextPage) => void changePage(nextPage)} />
          </>
        ) : null}
      </section>
      {summary ? (
        <>
          <section className="panel audit-day">
            <h2>Eventos por día</h2>
            <p className="muted">Últimos 30 días, incluidos los días sin eventos.</p>
            {dayOption ? <ReportChart option={dayOption} label="Eventos de la bitácora por día" /> : <p className="muted">No hubo eventos en los últimos 30 días.</p>}
          </section>
          <div className="audit-charts">
            <section className="panel">
              <h2>Eventos por módulo</h2>
              {moduleOption ? <ReportChart option={moduleOption} label="Eventos de la bitácora por módulo" /> : <p className="muted">Todavía no hay eventos.</p>}
            </section>
            <section className="panel">
              <h2>Eventos por acción</h2>
              {actionOption ? <ReportChart option={actionOption} label="Eventos de la bitácora por acción" /> : <p className="muted">Todavía no hay eventos.</p>}
            </section>
          </div>
        </>
      ) : chartError ? <FormError message={chartError} /> : <p className="muted">Cargando gráficos…</p>}
    </div>
  )
}

function eventCount(total: number): string {
  return total === 1 ? '1 evento' : `${total} eventos`
}

function dayChart(summary: AuditSummary): EChartsCoreOption | null {
  if (summary.byDay.every((point) => point.count === 0)) return null
  return {
    color: ['#055494'],
    textStyle: { fontFamily: 'Jost, "Segoe UI", sans-serif' },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${amount(value)} eventos` },
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: summary.byDay.map((point) => shortDate(point.date)),
      axisLabel: { color: '#7e7e80' },
    },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#7e7e80' } },
    series: [{
      type: 'line',
      name: 'Eventos',
      smooth: true,
      showSymbol: summary.byDay.filter((point) => point.count > 0).length < 15,
      areaStyle: { color: 'rgba(5, 84, 148, 0.12)' },
      data: summary.byDay.map((point) => point.count),
    }],
  }
}

function barChart(
  rows: Array<{ name: string; count: number }>,
  label: (name: string) => string,
  seriesName: string,
): EChartsCoreOption | null {
  if (rows.length === 0) return null
  const items = [...rows].reverse()
  return {
    color: ['#055494'],
    textStyle: { fontFamily: 'Jost, "Segoe UI", sans-serif' },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${amount(value)} eventos` },
    grid: { left: 16, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#7e7e80' } },
    yAxis: {
      type: 'category',
      data: items.map((item) => label(item.name)),
      axisLabel: { color: '#1c1c1c', width: 140, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      name: seriesName,
      data: items.map((item) => item.count),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
  }
}

function moduleLabel(name: string): string {
  const labels: Record<string, string> = {
    AUTH: 'Sesión',
    CATALOGO: 'Catálogo',
    CUPONES: 'Cupones',
    INVENTARIO: 'Inventario',
    PEDIDOS: 'Pedidos',
    USUARIOS: 'Usuarios',
  }
  return labels[name] ?? name
}

function actionLabel(name: string): string {
  const labels: Record<string, string> = {
    CREAR: 'Crear',
    MODIFICAR: 'Modificar',
    DESACTIVAR: 'Desactivar',
    CAMBIO_ESTADO: 'Cambio de estado',
    INICIAR_SESION: 'Iniciar sesión',
    CERRAR_SESION: 'Cerrar sesión',
    RENOVAR_SESION: 'Renovar sesión',
    TOKEN_REUTILIZADO: 'Token reutilizado',
    CAMBIO_CONTRASENA: 'Cambiar contraseña',
    CAMBIAR_CONTRASENA: 'Cambiar contraseña',
  }
  return labels[name] ?? name
}

function shortDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' }).format(new Date(year, month - 1, day))
}

function amount(value: unknown): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(parsed) ? parsed : 0
}
