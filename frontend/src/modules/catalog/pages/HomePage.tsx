import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { CreditCard, Headset, Truck } from 'lucide-react'
import { EmptyState, Spinner } from '../../../shared/components/ui.tsx'
import { listProducts } from '../catalog.api.ts'
import { useCatalog } from '../use-catalog.ts'
import { ProductCard, ProductImage } from '../components/ProductCard.tsx'
import { formatProductPrice } from '../price.ts'
import type { ProductSummary } from '../catalog.types.ts'

function useMidnightCountdown() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  const diff = Math.max(0, end.getTime() - now.getTime())
  return {
    hours: String(Math.floor(diff / 3_600_000)).padStart(2, '0'),
    minutes: String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, '0'),
    seconds: String(Math.floor((diff % 60_000) / 1000)).padStart(2, '0'),
  }
}

export function HomePage() {
  const { categories, loading: categoriesLoading, error: categoryError } = useCatalog()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const countdown = useMidnightCountdown()

  useEffect(() => {
    let active = true
    void listProducts({ page: 1, pageSize: 8, sort: 'name_asc' })
      .then((page) => {
        if (active) setProducts(page.products)
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

  const featured = [...products].sort(
    (left, right) => Number(left.price.minimum ?? Infinity) - Number(right.price.minimum ?? Infinity),
  )[0]

  return (
    <div className="page home-page">
      <section className="hero-row">
        <aside className="departments">
          <h2>Todas las Categorías</h2>
          {categoryError ? <p className="menu-note">{categoryError}</p> : null}
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <Link to={`/tienda?categoria=${category.id}`}>{category.name}</Link>
              </li>
            ))}
            {!categoriesLoading && !categoryError && categories.length === 0 ? <li className="menu-note">Sin categorías todavía.</li> : null}
          </ul>
        </aside>
        <div className="banner">
          <div className="banner-copy">
            <p className="eyebrow">ShopCart</p>
            <h1>{featured ? featured.name : 'El nuevo estándar'}</h1>
            <p>{featured?.description || 'Catálogo, variantes y checkout conectados a tu API.'}</p>
            {featured ? (
              <>
                <p className="from">Desde</p>
                <p className="banner-price">{formatProductPrice(featured)}</p>
                <Link className="banner-link" to={`/producto/${featured.id}`}>Comprar ahora</Link>
              </>
            ) : (
              <Link className="banner-link" to="/tienda">Ver tienda</Link>
            )}
          </div>
          {featured ? (
            <div className="banner-product">
              <ProductImage src={featured.primaryImage} alt="" />
            </div>
          ) : null}
        </div>
      </section>

      <div className="home-categories">
        {categories.map((category) => (
          <Link key={category.id} to={`/tienda?categoria=${category.id}`}>{category.name}</Link>
        ))}
      </div>

      <section className="benefits">
        <article>
          <Truck />
          <div>
            <strong>Precios en quetzales</strong>
            <span>IVA incluido en cada producto</span>
          </div>
        </article>
        <article>
          <Headset />
          <div>
            <strong>Soporte de la tienda</strong>
            <span>Pedidos, devoluciones y cuenta</span>
          </div>
        </article>
        <article>
          <CreditCard />
          <div>
            <strong>Pago flexible</strong>
            <span>Tarjeta de prueba o contra entrega</span>
          </div>
        </article>
      </section>

      {loading ? <div className="page-center"><Spinner /></div> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!loading && !error && !featured ? (
        <EmptyState
          title="El catálogo está vacío"
          message="Cuando la base tenga productos activos, aparecerán aquí."
        />
      ) : null}

      {featured ? (
        <section className="deal">
          <div className="section-head">
            <p className="section-kicker">Destacado del día</p>
            <div className="countdown" aria-label="Tiempo restante del día">
              <span>{countdown.hours}</span>
              <span>{countdown.minutes}</span>
              <span>{countdown.seconds}</span>
            </div>
          </div>
          <div className="deal-card">
            <Link to={`/producto/${featured.id}`} className="deal-media">
              <ProductImage src={featured.primaryImage} alt={featured.name} />
            </Link>
            <div>
              <p className="product-category">{featured.category.name}</p>
              <h2>{featured.name}</h2>
              <p className="muted">{featured.description}</p>
              <p className="deal-price">{formatProductPrice(featured)}</p>
              <Link className="btn" to={`/producto/${featured.id}`}>Ver producto</Link>
            </div>
          </div>
        </section>
      ) : null}

      {products.length > 0 ? (
        <section className="product-section">
          <div className="section-head">
            <h2>Productos</h2>
            <Link to="/tienda">Ver tienda</Link>
          </div>
          <div className="product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      ) : null}
    </div>
  )
}
