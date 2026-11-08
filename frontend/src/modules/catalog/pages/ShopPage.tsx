import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { OutlinedField } from '../../../shared/components/outlined-field.tsx'
import { EmptyState, PageHeader, Pagination, Spinner } from '../../../shared/components/ui.tsx'
import { listProducts } from '../catalog.api.ts'
import { useCatalog } from '../use-catalog.ts'
import { ProductCard } from '../components/ProductCard.tsx'
import { isProductSort } from '../price.ts'
import type { PageInfo, ProductSummary } from '../catalog.types.ts'

interface ShopResult {
  key: string
  products: ProductSummary[]
  pagination: PageInfo | null
  error: string | null
}

export function ShopPage() {
  const { categories } = useCatalog()
  const [params, setParams] = useSearchParams()
  const queryKey = params.toString()
  const minParam = params.get('min') ?? ''
  const maxParam = params.get('max') ?? ''
  const [minPrice, setMinPrice] = useState(minParam)
  const [maxPrice, setMaxPrice] = useState(maxParam)
  const [priceKey, setPriceKey] = useState(`${minParam}|${maxParam}`)
  const [result, setResult] = useState<ShopResult | null>(null)
  const nextPriceKey = `${minParam}|${maxParam}`

  if (nextPriceKey !== priceKey) {
    setPriceKey(nextPriceKey)
    setMinPrice(minParam)
    setMaxPrice(maxParam)
  }

  useEffect(() => {
    let active = true
    const current = new URLSearchParams(queryKey)
    const sortParam = current.get('orden')
    const category = current.get('categoria') ?? ''
    const search = current.get('q') ?? ''
    void listProducts({
      page: Math.max(1, Number(current.get('pagina') ?? '1') || 1),
      pageSize: 12,
      sort: isProductSort(sortParam) ? sortParam : 'name_asc',
      search: search || undefined,
      categoryId: category ? Number(category) : undefined,
      minPrice: minNumber(current.get('min')),
      maxPrice: minNumber(current.get('max')),
      available: current.get('disponible') === '1',
    })
      .then((pageResult) => {
        if (active) setResult({ key: queryKey, products: pageResult.products, pagination: pageResult.pagination, error: null })
      })
      .catch((caught: unknown) => {
        if (active) setResult({ key: queryKey, products: [], pagination: null, error: errorMessage(caught) })
      })
    return () => {
      active = false
    }
  }, [queryKey])

  const products = result?.key === queryKey ? result.products : []
  const pagination = result?.key === queryKey ? result.pagination : null
  const error = result?.key === queryKey ? result.error : null
  const loading = result?.key !== queryKey
  const categoryId = params.get('categoria') ?? ''
  const sortParam = params.get('orden')
  const sort = isProductSort(sortParam) ? sortParam : 'name_asc'
  const available = params.get('disponible') === '1'
  const search = params.get('q') ?? ''

  function update(next: Record<string, string | null>, keepPage = false) {
    const updated = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (!value) updated.delete(key)
      else updated.set(key, value)
    }
    if (!keepPage) updated.delete('pagina')
    setParams(updated)
  }

  function applyPrice(event: FormEvent) {
    event.preventDefault()
    update({ min: minPrice.trim() || null, max: maxPrice.trim() || null })
  }

  return (
    <div className="page">
      <PageHeader
        title="Tienda"
        subtitle={search ? `Resultados para “${search}”` : 'Explora el catálogo activo de ShopCart.'}
      />
      <div className="shop-layout">
        <aside className="filters">
          <h2>Departamentos</h2>
          <button type="button" className={!categoryId ? 'is-active' : ''} onClick={() => update({ categoria: null })}>
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={categoryId === String(category.id) ? 'is-active' : ''}
              onClick={() => update({ categoria: String(category.id) })}
            >
              {category.name}
            </button>
          ))}
          <form onSubmit={applyPrice}>
            <h2>Precio</h2>
            <div className="price-range">
              <OutlinedField label="Mínimo" inputMode="decimal" value={minPrice} onChange={setMinPrice} />
              <OutlinedField label="Máximo" inputMode="decimal" value={maxPrice} onChange={setMaxPrice} />
            </div>
            <button className="btn" type="submit">Aplicar</button>
          </form>
          <label className="check">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => update({ disponible: event.target.checked ? '1' : null })}
            />
            Solo con existencia
          </label>
        </aside>
        <div>
          <div className="toolbar">
            <p>{pagination ? `${pagination.total} productos` : 'Cargando productos'}</p>
            <label>
              Ordenar
              <select value={sort} onChange={(event) => update({ orden: event.target.value })}>
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
                <option value="price_asc">Precio menor</option>
                <option value="price_desc">Precio mayor</option>
              </select>
            </label>
          </div>
          {loading ? <div className="page-center"><Spinner /></div> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {!loading && !error && products.length === 0 ? (
            <EmptyState title="No hay productos" message="Prueba con otra categoría o limpia los filtros." />
          ) : null}
          <div className="product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {pagination ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPage={(nextPage) => update({ pagina: String(nextPage) }, true)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function minNumber(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
