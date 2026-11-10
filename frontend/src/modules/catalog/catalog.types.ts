export interface Category {
  id: number
  name: string
  active: boolean
}

export interface ProductPrice {
  minimum: number | null
  maximum: number | null
  minimumDisplay: string | null
  maximumDisplay: string | null
}

export interface ProductSummary {
  currency: string
  currencySymbol: string
  id: number
  name: string
  description: string | null
  active: boolean
  category: { id: number; name: string }
  primaryImage: string | null
  price: ProductPrice
  stock: number
  variantCount: number
}

export interface ProductVariant {
  id: number
  sku: string
  price: number
  priceDisplay: string
  stock: number
  active: boolean
  imageUrl: string | null
  attributes: Array<{ id: number; name: string; value: string }>
}

export interface ProductDetail {
  currency: string
  currencySymbol: string
  id: number
  name: string
  description: string | null
  active: boolean
  category: { id: number; name: string }
  images: Array<{ id: number; url: string; order: number }>
  variants: ProductVariant[]
}

export type ProductSort = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'

export interface ProductQuery {
  page?: number
  pageSize?: number
  categoryId?: number
  search?: string
  minPrice?: number
  maxPrice?: number
  available?: boolean
  sort?: ProductSort
}

export interface PageInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
