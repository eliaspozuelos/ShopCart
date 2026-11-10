import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage } from '../../../shared/api/client.ts'
import { formatDate } from '../../../shared/lib/money.ts'
import { useToast } from '../../../shared/components/use-toast.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { FormError, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import type { PageInfo, ProductDetail, ProductSummary, ProductVariant } from '../../catalog/catalog.types.ts'
import { adjustStock, getAdminProduct, listAdminProducts, listMovements, type StockMovement } from '../admin.api.ts'

const movementTypeOptions = [
  { value: '', label: 'Todos' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SALIDA', label: 'Salida' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste positivo' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste negativo' },
  { value: 'DEVOLUCION', label: 'Devolución' },
]

function movementTypeLabel(type: string): string {
  return movementTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function InventoryPage() {
  const toast = useToast()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementType, setMovementType] = useState('')
  const [movementPage, setMovementPage] = useState<PageInfo | null>(null)
  const [paging, setPaging] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductSummary[]>([])
  const [resultPage, setResultPage] = useState<PageInfo | null>(null)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [reason, setReason] = useState('')
  const [stocks, setStocks] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function loadMovements(page = 1, type = movementType) {
    const result = await listMovements({ page, ...(type ? { type } : {}) })
    setMovements(result.movements)
    setMovementPage(result.pagination)
  }

  useEffect(() => {
    let active = true
    void listMovements({ page: 1 })
      .then((result) => {
        if (!active) return
        setMovements(result.movements)
        setMovementPage(result.pagination)
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

  async function changeMovementType(type: string) {
    setMovementType(type)
    setPaging(true)
    setError(null)
    try {
      await loadMovements(1, type)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPaging(false)
    }
  }

  async function changeMovementPage(page: number) {
    setPaging(true)
    setError(null)
    try {
      await loadMovements(page, movementType)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPaging(false)
    }
  }

  async function searchProducts(term: string, page: number) {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      setError('Escribe al menos 2 letras del nombre.')
      return
    }
    setSearching(true)
    setError(null)
    try {
      const result = await listAdminProducts({ search: trimmed, page, pageSize: 10 })
      setResults(result.products)
      setResultPage(result.pagination)
      setSearched(true)
    } catch (caught) {
      setResults([])
      setResultPage(null)
      setError(errorMessage(caught))
    } finally {
      setSearching(false)
    }
  }

  function findProducts(event: FormEvent) {
    event.preventDefault()
    void searchProducts(query, 1)
  }

  async function chooseProduct(productId: number) {
    setPending(true)
    setError(null)
    try {
      const detail = await getAdminProduct(productId)
      setProduct(detail)
      setVariants(detail.variants)
      const next: Record<number, string> = {}
      detail.variants.forEach((variant) => {
        next[variant.id] = String(variant.stock)
      })
      setStocks(next)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  function cancelAdjustment() {
    setProduct(null)
    setVariants([])
    setReason('')
    setStocks({})
    setError(null)
  }

  async function saveStock(variant: ProductVariant) {
    if (!product) return
    setPending(true)
    setError(null)
    try {
      await adjustStock(variant.id, Number(stocks[variant.id] ?? 0), reason)
      await loadMovements(1, movementType)
      const detail = await getAdminProduct(product.id)
      setProduct(detail)
      setVariants(detail.variants)
      toast.success('Existencia actualizada.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="admin-page">
      <PageHeader title="Inventario" subtitle="Busca el producto por nombre, ajusta la existencia y consulta el kardex." />
      <FormError message={error} />
      <form className="inline-actions" onSubmit={findProducts}>
        <OutlinedField label="Producto" required minLength={2} value={query} onChange={setQuery} />
        <button className="btn btn-ghost" type="submit" disabled={searching}>Buscar</button>
      </form>
      {searched ? (
        <section className="panel">
          {results.length === 0 ? (
            <p>No hay productos con ese nombre.</p>
          ) : (
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Producto</th><th>Categoría</th><th>Variantes</th><th>Stock</th><th></th></tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      {item.active ? null : <span className="muted"> Inactivo</span>}
                    </td>
                    <td>{item.category.name}</td>
                    <td>{item.variantCount}</td>
                    <td>{item.stock}</td>
                    <td>
                      <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => void chooseProduct(item.id)}>
                        Elegir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {resultPage ? (
            <Pagination page={resultPage.page} totalPages={resultPage.totalPages} disabled={searching} onPage={(page) => void searchProducts(query, page)} />
          ) : null}
        </section>
      ) : null}
      {product && variants.length > 0 ? (
        <section className="panel stack">
          <div className="inventory-head">
            <h2>{product.name}</h2>
            <button className="btn btn-ghost" type="button" disabled={pending} onClick={cancelAdjustment}>Cancelar</button>
          </div>
          <OutlinedField label="Motivo del ajuste" required minLength={3} value={reason} onChange={setReason} />
          {variants.map((variant) => {
            const detail = variant.attributes.map((attribute) => attribute.value).filter(Boolean).join(' · ')
            return (
              <div key={variant.id} className="inline-actions">
                <strong>{variant.sku}</strong>
                {detail ? <span>{detail}</span> : null}
                {variant.active ? null : <span>Inactiva</span>}
                <span>Disponible {variant.stock}</span>
                <OutlinedField label="Nueva existencia" type="number" min="0" value={stocks[variant.id] ?? ''} onChange={(value) => setStocks({ ...stocks, [variant.id]: value })} />
                <button className="btn" type="button" disabled={pending || reason.trim().length < 3} onClick={() => void saveStock(variant)}>Guardar</button>
              </div>
            )
          })}
        </section>
      ) : null}
      <section className="panel">
        <div className="inventory-head">
          <h2>Kardex</h2>
          <label className="inventory-type">
            Tipo
            <select value={movementType} disabled={paging} onChange={(event) => void changeMovementType(event.target.value)}>
              {movementTypeOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        {movementPage ? <p className="muted">{movementPage.total === 1 ? '1 movimiento' : `${movementPage.total} movimientos`}</p> : null}
        {movements.length === 0 ? (
          <p>No hay movimientos de ese tipo.</p>
        ) : (
          <div className="table-scroll">
          <table className="data-table kardex-table">
            <thead><tr><th>Fecha</th><th>Producto</th><th>SKU</th><th>Tipo</th><th>Cantidad</th><th>Resultado</th><th>Motivo</th></tr></thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatDate(movement.createdAt)}</td>
                  <td>{movement.productName}</td>
                  <td>{movement.sku}</td>
                  <td>{movementTypeLabel(movement.type)}</td>
                  <td>{movement.quantity}</td>
                  <td>{movement.resultingStock}</td>
                  <td>{movement.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {movementPage ? (
          <Pagination page={movementPage.page} totalPages={movementPage.totalPages} disabled={paging} onPage={(page) => void changeMovementPage(page)} />
        ) : null}
      </section>
    </div>
  )
}
