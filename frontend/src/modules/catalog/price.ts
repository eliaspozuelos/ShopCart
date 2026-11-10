import { money } from '../../shared/lib/money.ts'
import type { ProductSort, ProductSummary } from './catalog.types.ts'

export function formatProductPrice(product: ProductSummary): string {
  const minimum = Number(product.price.minimum)
  const symbol = product.currencySymbol || 'Q'
  if (!Number.isFinite(minimum)) return 'Sin precio'
  return product.price.minimumDisplay ?? money(minimum, symbol)
}

export function extraOptionLabel(variantCount: number | null | undefined): string | null {
  const extra = Number(variantCount) - 1
  if (!Number.isFinite(extra) || extra <= 0) return null
  if (extra === 1) return '1 opción más disponible'
  return `${extra} opciones más disponibles`
}

export function isProductSort(value: string | null): value is ProductSort {
  return value === 'name_asc' || value === 'name_desc' || value === 'price_asc' || value === 'price_desc'
}
