import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '../../../shared/api/client.ts'
import { ShoppingCart } from 'lucide-react'
import { useToast } from '../../../shared/components/use-toast.ts'
import { useCart } from '../../cart/use-cart.ts'
import { getProduct } from '../catalog.api.ts'
import { formatProductPrice } from '../price.ts'
import type { ProductSummary } from '../catalog.types.ts'

export function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className="image-fallback" aria-hidden="true">{alt.slice(0, 1).toUpperCase()}</div>
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} />
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const cart = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const outOfStock = product.stock <= 0

  async function addToCart() {
    setPending(true)
    try {
      const detail = await getProduct(product.id)
      const available = detail.variants.filter((variant) => variant.active && variant.stock > 0)
      const onlyVariant = available.length === 1 ? available[0] : undefined
      if (!onlyVariant) {
        navigate(`/producto/${product.id}`)
        return
      }
      const already = cart.cart?.items.some((item) => item.variantId === onlyVariant.id)
      if (already) {
        cart.openCart()
        toast.success('Ya está en el carrito. La cantidad se cambia ahí.')
        return
      }
      await cart.addItem(onlyVariant.id, 1)
      cart.openCart()
      toast.success('Se agregó 1 unidad al carrito.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="product-card">
      <Link className="product-media" to={`/producto/${product.id}`}>
        <ProductImage src={product.primaryImage} alt={product.name} />
        <span className={outOfStock ? 'stock-pill out' : 'stock-pill'}>
          {outOfStock ? 'Agotado' : 'Disponible'}
        </span>
      </Link>
      <p className="product-category">{product.category.name}</p>
      <h3 className="product-name">
        <Link to={`/producto/${product.id}`}>{product.name}</Link>
      </h3>
      <div className="product-bottom">
        <strong className="product-price">{formatProductPrice(product)}</strong>
        <button
          type="button"
          className="add-btn"
          aria-label={`Agregar ${product.name} al carrito`}
          disabled={pending || outOfStock}
          onClick={() => void addToCart()}
        >
          <ShoppingCart />
        </button>
      </div>
    </article>
  )
}
