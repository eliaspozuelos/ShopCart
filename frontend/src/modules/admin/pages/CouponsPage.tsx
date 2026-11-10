import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Pencil, Power, PowerOff, Ticket } from 'lucide-react'
import { errorMessage } from '../../../shared/api/client.ts'
import { formatDate, money } from '../../../shared/lib/money.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField, OutlinedSelect } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import {
  createCoupon,
  listAdminCategories,
  listCoupons,
  setCouponActive,
  toApiDateTime,
  updateCoupon,
  type Coupon,
} from '../admin.api.ts'
import type { Category, PageInfo } from '../../catalog/catalog.types.ts'

type CouponType = 'PORCENTAJE' | 'MONTO'

interface CouponForm {
  code: string
  type: CouponType
  value: string
  minimumAmount: string
  validFrom: string
  validUntil: string
  totalUsageLimit: string
  usageLimitPerCustomer: string
  categoryId: string
}

const emptyForm: CouponForm = {
  code: '',
  type: 'PORCENTAJE',
  value: '',
  minimumAmount: '0',
  validFrom: '',
  validUntil: '',
  totalUsageLimit: '100',
  usageLimitPerCustomer: '1',
  categoryId: '',
}

export function CouponsPage() {
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CouponForm>(emptyForm)

  async function load(next: { page?: number; search?: string } = {}) {
    const nextPage = next.page ?? page
    const nextSearch = next.search ?? appliedSearch
    const [couponPage, nextCategories] = await Promise.all([
      listCoupons(nextPage, nextSearch),
      listAdminCategories(),
    ])
    setCoupons(couponPage.coupons)
    setPagination(couponPage.pagination)
    setCategories(nextCategories)
    setPage(couponPage.pagination.page)
    setAppliedSearch(nextSearch)
  }

  useEffect(() => {
    let active = true
    void Promise.all([listCoupons(), listAdminCategories()])
      .then(([couponPage, nextCategories]) => {
        if (!active) return
        setCoupons(couponPage.coupons)
        setPagination(couponPage.pagination)
        setCategories(nextCategories)
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

  function patchForm(patch: Partial<CouponForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function beginEdit(coupon: Coupon) {
    setEditingId(coupon.id)
    setError(null)
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minimumAmount: String(coupon.minimumAmount),
      validFrom: toLocalInput(coupon.validFrom),
      validUntil: toLocalInput(coupon.validUntil),
      totalUsageLimit: String(coupon.totalUsageLimit),
      usageLimitPerCustomer: String(coupon.usageLimitPerCustomer),
      categoryId: coupon.category ? String(coupon.category.id) : '',
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const parsed = parseCouponForm(form, editingId !== null)
    if (typeof parsed === 'string') {
      setError(parsed)
      return
    }
    setPending(true)
    setError(null)
    try {
      if (editingId) {
        await updateCoupon(editingId, {
          minimumAmount: parsed.minimumAmount,
          validFrom: parsed.validFrom,
          validUntil: parsed.validUntil,
          totalUsageLimit: parsed.totalUsageLimit,
          usageLimitPerCustomer: parsed.usageLimitPerCustomer,
          categoryId: parsed.categoryId,
        })
        setEditingId(null)
        setForm(emptyForm)
        await load()
        toast.success('Cupón actualizado.')
      } else {
        await createCoupon(parsed)
        setForm(emptyForm)
        setSearch(parsed.code)
        await load({ page: 1, search: parsed.code })
        toast.success('Cupón creado.')
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function findCoupons(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setEditingId(null)
    try {
      await load({ page: 1, search })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function changePage(nextPage: number) {
    setError(null)
    setEditingId(null)
    try {
      await load({ page: nextPage })
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function toggle(coupon: Coupon) {
    try {
      await setCouponActive(coupon.id, !coupon.active)
      await load()
      toast.success(coupon.active ? 'Cupón desactivado.' : 'Cupón activado.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  const selectedCategoryId = form.categoryId
  const categoryOptions = categories.filter((category) => category.active || String(category.id) === selectedCategoryId)

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Cupones" subtitle="Porcentaje o monto fijo. Cada pedido acepta un solo cupón." />
      <FormError message={error} />
      <form ref={formRef} className="panel coupon-form" onSubmit={(event) => void save(event)}>
        <div className="section-head">
          <h2><Ticket /> {editingId ? `Editar ${form.code}` : 'Nuevo cupón'}</h2>
        </div>
        {editingId ? (
          <p className="coupon-summary">
            <strong>{form.code}</strong>
            <span>{form.type === 'PORCENTAJE' ? `${form.value}%` : money(form.value)}</span>
            <span>{form.type === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo'}</span>
          </p>
        ) : (
          <>
            <OutlinedField label="Código" required maxLength={30} value={form.code} onChange={(value) => patchForm({ code: value.toUpperCase() })} />
            <OutlinedSelect label="Tipo" required value={form.type} onChange={(value) => patchForm({ type: value as CouponType })}>
              <option value="PORCENTAJE">Porcentaje</option>
              <option value="MONTO">Monto fijo</option>
            </OutlinedSelect>
            <OutlinedField
              label={form.type === 'PORCENTAJE' ? 'Porcentaje' : 'Monto'}
              required
              type="number"
              min="0.01"
              max={form.type === 'PORCENTAJE' ? '100' : undefined}
              step="0.01"
              value={form.value}
              onChange={(value) => patchForm({ value })}
            />
          </>
        )}
        <OutlinedField label="Compra mínima" required type="number" min="0" step="0.01" value={form.minimumAmount} onChange={(value) => patchForm({ minimumAmount: value })} />
        <OutlinedField label="Vigente desde" required type="datetime-local" value={form.validFrom} onChange={(value) => patchForm({ validFrom: value })} />
        <OutlinedField label="Vigente hasta" required type="datetime-local" value={form.validUntil} onChange={(value) => patchForm({ validUntil: value })} />
        <OutlinedField label="Límite total de usos" required type="number" min="1" step="1" value={form.totalUsageLimit} onChange={(value) => patchForm({ totalUsageLimit: value })} />
        <OutlinedField label="Límite por cliente" required type="number" min="1" step="1" value={form.usageLimitPerCustomer} onChange={(value) => patchForm({ usageLimitPerCustomer: value })} />
        <OutlinedSelect label="Aplica a" value={form.categoryId} onChange={(value) => patchForm({ categoryId: value })}>
          <option value="">Todo el carrito</option>
          {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </OutlinedSelect>
        <div className="form-actions">
          <button className="btn" type="submit" disabled={pending}>{editingId ? 'Guardar cupón' : 'Crear cupón'}</button>
          {editingId ? <button className="btn btn-ghost" type="button" disabled={pending} onClick={cancelEdit}>Cancelar</button> : null}
        </div>
        <p className="catalog-note">
          Sin categoría, el descuento aplica a todo el carrito. El código, el tipo y el valor no se cambian después de crearlo.
          Para quitarlo de la tienda se desactiva: los pedidos que ya lo usaron conservan el descuento.
        </p>
      </form>
      <section className="panel">
        <div className="section-head">
          <h2><Ticket /> Cupones</h2>
          {pagination ? <p className="muted">{couponCount(pagination.total)}</p> : null}
        </div>
        <form className="inline-actions catalog-toolbar" onSubmit={(event) => void findCoupons(event)}>
          <OutlinedField label="Buscar cupón" maxLength={50} value={search} onChange={setSearch} />
          <button className="btn btn-ghost" type="submit">Buscar</button>
        </form>
        {coupons.length === 0 ? <p className="muted">{appliedSearch ? 'No hay cupones con esa búsqueda.' : 'Todavía no hay cupones.'}</p> : (
          <div className="table-scroll">
            <table className="data-table coupon-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Mínimo</th>
                  <th>Vigencia</th>
                  <th>Usos</th>
                  <th>Aplica a</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className={editingId === coupon.id ? 'is-open' : ''}>
                    <td>{coupon.code}</td>
                    <td>{coupon.type === 'PORCENTAJE' ? `${coupon.value}%` : money(coupon.value)}</td>
                    <td>{money(coupon.minimumAmount)}</td>
                    <td>{formatDate(coupon.validFrom)} – {formatDate(coupon.validUntil)}</td>
                    <td>{coupon.currentUsages}/{coupon.totalUsageLimit} · {coupon.usageLimitPerCustomer} por cliente</td>
                    <td>{coupon.category?.name ?? 'Todo el carrito'}</td>
                    <td><span className={statusClass(coupon)}>{statusLabel(coupon)}</span></td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="catalog-action" aria-label={`Editar ${coupon.code}`} onClick={() => beginEdit(coupon)}>
                          <Pencil />
                        </button>
                        <button
                          type="button"
                          className="catalog-action"
                          aria-label={coupon.active ? `Desactivar ${coupon.code}` : `Activar ${coupon.code}`}
                          disabled={pending}
                          onClick={() => void toggle(coupon)}
                        >
                          {coupon.active ? <Power /> : <PowerOff />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination ? <Pagination page={pagination.page} totalPages={pagination.totalPages} onPage={(nextPage) => void changePage(nextPage)} /> : null}
      </section>
    </div>
  )
}

function couponCount(total: number): string {
  return total === 1 ? '1 cupón' : `${total} cupones`
}

function statusLabel(coupon: Coupon): string {
  if (!coupon.active) return 'Inactivo'
  const now = Date.now()
  if (now < new Date(coupon.validFrom).getTime()) return 'Aún no inicia'
  if (now > new Date(coupon.validUntil).getTime()) return 'Vencido'
  return 'Vigente'
}

function statusClass(coupon: Coupon): string {
  if (!coupon.active) return 'order-status is-bad'
  return coupon.isValid ? 'order-status is-done' : 'order-status is-wait'
}

function toLocalInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseCouponForm(form: CouponForm, editing: boolean): {
  code: string
  type: CouponType
  value: number
  minimumAmount: number
  validFrom: string
  validUntil: string
  totalUsageLimit: number
  usageLimitPerCustomer: number
  categoryId: number | null
} | string {
  const code = form.code.trim().toUpperCase()
  if (!editing && (code.length < 3 || code.length > 30)) return 'El código debe tener entre 3 y 30 caracteres.'
  const value = roundAmount(form.value)
  if (!editing && (value === null || value <= 0)) return 'El valor del descuento debe ser mayor que cero.'
  if (!editing && form.type === 'PORCENTAJE' && value !== null && value > 100) return 'El porcentaje no puede ser mayor que 100.'
  const minimumAmount = roundAmount(form.minimumAmount)
  if (minimumAmount === null || minimumAmount < 0) return 'La compra mínima no puede ser negativa.'
  if (!form.validFrom || !form.validUntil) return 'Indica el inicio y el fin de la vigencia.'
  const validFrom = toApiDateTime(form.validFrom)
  const validUntil = toApiDateTime(form.validUntil)
  if (new Date(validUntil) <= new Date(validFrom)) return 'La vigencia debe terminar después de que empiece.'
  const totalUsageLimit = wholeNumber(form.totalUsageLimit)
  const usageLimitPerCustomer = wholeNumber(form.usageLimitPerCustomer)
  if (!totalUsageLimit || !usageLimitPerCustomer) return 'Los límites de uso deben ser números enteros mayores que cero.'
  return {
    code,
    type: form.type,
    value: value ?? 0,
    minimumAmount,
    validFrom,
    validUntil,
    totalUsageLimit,
    usageLimitPerCustomer,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
  }
}

function roundAmount(value: string): number | null {
  if (!value.trim()) return null
  const amount = Math.round(Number(value) * 100) / 100
  return Number.isFinite(amount) ? amount : null
}

function wholeNumber(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const amount = Number(value)
  return amount >= 1 ? amount : null
}
