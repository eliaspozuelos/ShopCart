import { api } from '../../shared/api/client.ts'
import type { Category, PageInfo, ProductDetail, ProductQuery, ProductSummary } from './catalog.types.ts'

interface Envelope<T> {
  data: T
}

interface CatalogListPayload {
  data: ProductSummary[]
  pagination: {
    page: number
    pageSize: number
    totalRecords: number
    totalPages: number
  }
}

function toQuery(query: ProductQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 12))
  params.set('sort', query.sort ?? 'name_asc')
  if (query.categoryId) params.set('categoryId', String(query.categoryId))
  if (query.search) params.set('search', query.search)
  if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice))
  if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice))
  if (query.available) params.set('available', 'true')
  return params.toString()
}

export async function listCategories(): Promise<Category[]> {
  const body = await api<Envelope<Category[]>>('/api/v1/catalog/categories')
  return body.data
}

export async function listProducts(query: ProductQuery = {}): Promise<{ products: ProductSummary[]; pagination: PageInfo }> {
  // El controlador envuelve de nuevo el objeto { data, pagination } del servicio.
  const body = await api<Envelope<CatalogListPayload>>(`/api/v1/catalog/products?${toQuery(query)}`)
  return {
    products: body.data.data,
    pagination: {
      page: body.data.pagination.page,
      pageSize: body.data.pagination.pageSize,
      total: body.data.pagination.totalRecords,
      totalPages: body.data.pagination.totalPages,
    },
  }
}

export async function getProduct(productId: number): Promise<ProductDetail> {
  const body = await api<Envelope<ProductDetail>>(`/api/v1/catalog/products/${productId}`)
  return body.data
}
