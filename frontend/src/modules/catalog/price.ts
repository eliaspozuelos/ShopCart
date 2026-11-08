import { money } from '../../shared/lib/money.ts'
import type { ProductSort, ProductSummary } from './catalog.types.ts'

export function formatProductPrice(product: ProductSummary): string {
  const minimum = Number(product.price.minimum)
  const maximum = Number(product.price.maximum)
  const symbol = product.currencySymbol || 'Q'
  if (!Number.isFinite(minimum)) return 'Sin precio'
  if (Number.isFinite(maximum) && maximum !== minimum) {
    const low = product.price.minimumDisplay ?? money(minimum, symbol)
    const high = product.price.maximumDisplay ?? money(maximum, symbol)
    return `${low} – ${high}`
  }
  return product.price.minimumDisplay ?? money(minimum, symbol)
}

export function isProductSort(value: string | null): value is ProductSort {
  return value === 'name_asc' || value === 'name_desc' || value === 'price_asc' || value === 'price_desc'
}
