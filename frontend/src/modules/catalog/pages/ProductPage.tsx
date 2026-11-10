import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../../../shared/api/client.ts'
import { Minus, Plus, ZoomIn } from 'lucide-react'
import { useToast } from '../../../shared/components/use-toast.ts'
import { Spinner } from '../../../shared/components/ui.tsx'
import { useCart } from '../../cart/use-cart.ts'
import { getProduct } from '../catalog.api.ts'
import { ProductImage } from '../components/ProductCard.tsx'
import type { ProductDetail, ProductVariant } from '../catalog.types.ts'

interface ProductResult {
  id: number
  product: ProductDetail | null
  error: string | null
}

export function ProductPage() {
  const params = useParams()
  const productId = Number(params.productId)
  const cart = useCart()
  const toast = useToast()
  const [result, setResult] = useState<ProductResult | null>(null)
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [pending, setPending] = useState(false)
  const product = result?.id === productId ? result.product : null
  const error = result?.id === productId ? result.error : null
  const loading = result?.id !== productId

  useEffect(() => {
    let active = true
    void getProduct(productId)
      .then((detail) => {
        if (!active) return
        setResult({ id: productId, product: detail, error: null })
        const activeVariants = detail.variants.filter((variant) => variant.active)
        const first = activeVariants.reduce<ProductVariant | undefined>((cheapest, variant) => (
          !cheapest || variant.price < cheapest.price ? variant : cheapest
        ), undefined) ?? detail.variants[0]
        const initial: Record<string, string> = {}
        first?.attributes.forEach((attribute) => {
          initial[attribute.name] = attribute.value
        })
        setSelection(initial)
        setQuantity(1)
      })
      .catch((caught: unknown) => {
        if (active) setResult({ id: productId, product: null, error: errorMessage(caught) })
      })
    return () => {
      active = false
    }
  }, [productId])

  const groups = useMemo(() => attributeGroups(product), [product])
  const selected = useMemo(() => findVariant(product, selection), [product, selection])
  const galleryImages = useMemo(() => {
    if (!product) return []
    if (selected?.imageUrl) return [{ id: selected.id, url: selected.imageUrl, order: 0 }]
    return product.images
  }, [product, selected])

  async function addToCart() {
    if (!selected) return
    setPending(true)
    try {
      await cart.addItem(selected.id, quantity)
      cart.openCart()
      toast.success('Producto agregado al carrito.')
    } catch (caught) {
      toast.error(errorMessage(caught))
      if (caught instanceof ApiError && caught.code === 'INSUFFICIENT_STOCK') {
        try {
          const detail = await getProduct(productId)
          setResult({ id: productId, product: detail, error: null })
          const variant = findVariant(detail, selection)
          const stock = variant?.stock ?? 0
          setQuantity((current) => (stock > 0 ? Math.min(current, stock) : 1))
        } catch {
          // El aviso ya explica que no hay existencia suficiente.
        }
      }
    } finally {
      setPending(false)
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>
  if (error || !product) {
    return (
      <div className="page narrow">
        <div className="empty">
          <h2>No se encontró el producto</h2>
          <p>{error ?? 'El producto no está disponible.'}</p>
          <Link className="btn" to="/tienda">Volver a la tienda</Link>
        </div>
      </div>
    )
  }

  const maxQuantity = Math.max(1, selected?.stock ?? 1)

  return (
    <div className="page product-page">
      <p className="breadcrumb">
        <Link to="/">Inicio</Link>
        <span>/</span>
        <Link to={`/tienda?categoria=${product.category.id}`}>{product.category.name}</Link>
        <span>/</span>
        {product.name}
      </p>
      <div className="product-detail">
        <ProductGallery
          images={galleryImages}
          name={selected ? `${product.name}, ${selected.attributes.map((attribute) => attribute.value).join(', ')}` : product.name}
        />
        <div className="product-info">
          <p className="product-category">{product.category.name}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{selected?.priceDisplay ?? 'Producto agotado seleccione otro producto'}</p>
          <p className="muted">{product.description}</p>
          {groups.map((group) => (
            <fieldset key={group.name}>
              <legend>{group.name}</legend>
              <div className="option-row">
                {group.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={selection[group.name] === value ? 'is-active' : ''}
                    onClick={() => setSelection((current) => ({ ...current, [group.name]: value }))}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          {selected ? (
            <p className="sku">SKU {selected.sku} · {selected.stock} disponibles</p>
          ) : (
            <p className="form-error">Esa combinación no está disponible.</p>
          )}
          <div className="buy-row">
            <div className="qty">
              <button type="button" aria-label="Quitar una unidad" onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus /></button>
              <input
                aria-label="Cantidad"
                value={quantity}
                inputMode="numeric"
                onChange={(event) => setQuantity(clampQuantity(event.target.value, maxQuantity))}
              />
              <button type="button" aria-label="Agregar una unidad" onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}><Plus /></button>
            </div>
            <button className="btn" type="button" disabled={!selected || selected.stock < 1 || pending} onClick={() => void addToCart()}>
              {selected && selected.stock < 1 ? 'Sin existencia' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductGallery({ images, name }: { images: ProductDetail['images']; name: string }) {
  const photos = useMemo(
    () => [...images].sort((left, right) => left.order - right.order || left.id - right.id),
    [images],
  )
  const [activeId, setActiveId] = useState(photos[0]?.id ?? null)
  const active = photos.find((photo) => photo.id === activeId) ?? photos[0] ?? null
  const lensRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setActiveId(photos[0]?.id ?? null)
  }, [photos])

  useEffect(() => {
    const lens = lensRef.current
    if (!lens) return
    lens.style.backgroundImage = active?.url ? `url("${active.url.replace(/["\\]/g, '')}")` : 'none'
  }, [active])

  function move(event: MouseEvent<HTMLDivElement>) {
    const lens = lensRef.current
    const rect = event.currentTarget.getBoundingClientRect()
    if (!lens || rect.width === 0 || rect.height === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    lens.style.backgroundPosition = `${x}% ${y}%`
  }

  return (
    <div className="gallery">
      <div className="gallery-main" onMouseMove={move}>
        <ProductImage src={active?.url ?? null} alt={name} />
        {active?.url ? (
          <span ref={lensRef} className="gallery-lens">
            <ZoomIn aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <div className="thumbs">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              className={photo.id === active?.id ? 'is-active' : ''}
              aria-label={`Foto ${index + 1} de ${photos.length}`}
              aria-pressed={photo.id === active?.id}
              onClick={() => setActiveId(photo.id)}
            >
              <ProductImage src={photo.url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function attributeGroups(product: ProductDetail | null): Array<{ name: string; values: string[] }> {
  const groups = new Map<string, string[]>()
  for (const variant of product?.variants ?? []) {
    for (const attribute of variant.attributes) {
      const values = groups.get(attribute.name) ?? []
      if (!values.includes(attribute.value)) values.push(attribute.value)
      groups.set(attribute.name, values)
    }
  }
  return [...groups.entries()].map(([name, values]) => ({ name, values }))
}

function findVariant(product: ProductDetail | null, selection: Record<string, string>): ProductVariant | null {
  if (!product) return null
  if (product.variants.length === 1 && product.variants[0]?.attributes.length === 0) {
    return product.variants[0]
  }
  return product.variants.find((variant) => (
    variant.attributes.length > 0
    && variant.attributes.every((attribute) => selection[attribute.name] === attribute.value)
  )) ?? null
}

function clampQuantity(value: string, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(max, Math.max(1, Math.trunc(parsed)))
}
