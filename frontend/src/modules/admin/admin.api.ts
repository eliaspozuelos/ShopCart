import { api, apiBlob, type UserRole } from '../../shared/api/client.ts'
import type { Category, PageInfo, ProductDetail, ProductQuery, ProductSummary } from '../catalog/catalog.types.ts'

interface Envelope<T> {
  data: T
}

export interface ReportSummary {
  orders: number
  sales: number
  averageTicket: number
}

export interface ReportPoint {
  period: string
  orders: number
  sales: number
}

export interface ReportCategory {
  category: string
  units: number
  sales: number
}

export interface ReportProduct {
  sku: string
  name: string
  units: number
  sales: number
}

export interface ReportStatus {
  status: string
  count: number
}

export interface ReportAttention {
  confirmed: number
  preparing: number
  dispatched: number
  onRoute: number
}

export interface ReportLosses {
  cancelledOrders: number
  cancelledAmount: number
  returnedAmount: number
  returnedOrders: number
}

export interface LowStockItem {
  sku: string
  product: string
  stock: number
}

export interface Dashboard {
  summary: ReportSummary
  salesByDay: ReportPoint[]
  salesByCategory: ReportCategory[]
  topProducts: ReportProduct[]
  statuses: ReportStatus[]
  abandonedCarts: number
  inactiveMinutes: number
  attention: ReportAttention
  losses: ReportLosses
  lowStockThreshold: number
  lowStockCount: number
  lowStockItems: LowStockItem[]
}

export interface AdminUser {
  id: number
  email: string
  name: string
  role: UserRole
  active: boolean
  createdAt: string
}

export interface Coupon {
  id: number
  code: string
  type: 'PORCENTAJE' | 'MONTO'
  value: number
  minimumAmount: number
  validFrom: string
  validUntil: string
  totalUsageLimit: number
  usageLimitPerCustomer: number
  currentUsages: number
  category: { id: number; name: string } | null
  active: boolean
  isValid: boolean
}

export interface StockMovement {
  id: number
  variantId: number
  sku: string
  productId: number
  productName: string
  type: string
  quantity: number
  resultingStock: number
  reason: string
  createdAt: string
}

export interface AuditEntry {
  id: number
  userId: number | null
  email: string | null
  module: string
  entity: string
  entityId: number | null
  action: string
  previous: string | null
  next: string | null
  createdAt: string
}

export interface Setting {
  key: string
  value: string
  description: string | null
  updatedAt: string | null
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

function amount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function flag(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1
}

function toQuery(query: ProductQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 20))
  params.set('sort', query.sort ?? 'name_asc')
  if (query.search) params.set('search', query.search)
  if (query.categoryId) params.set('categoryId', String(query.categoryId))
  return params.toString()
}

export async function downloadDashboard(from?: string, to?: string): Promise<void> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  const file = await apiBlob(`/api/v1/reports/dashboard/export${suffix}`)
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function getDashboard(from?: string, to?: string): Promise<Dashboard> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  const body = await api<Envelope<{
    summary: { Pedidos?: number; Ventas?: number | string; TicketPromedio?: number | string }
    salesByDay: Array<{ Periodo: string; Pedidos: number; Ventas: number | string }>
    salesByCategory: Array<{ Categoria: string; Unidades: number; Ventas: number | string }>
    topProducts: Array<{ SKUSnapshot: string; NombreSnapshot: string; Unidades: number; Ventas: number | string }>
    statuses: Array<{ Estado: string; Cantidad: number }>
    abandonedCarts: { CarritosAbandonados?: number; MinutosSinActividad?: number }
    attention?: { Confirmado?: number; Preparando?: number; Despachado?: number; EnRuta?: number }
    losses?: { PedidosCancelados?: number; MontoCancelado?: number | string; MontoDevuelto?: number | string; PedidosConDevolucion?: number }
    lowStock?: { Umbral?: number; Variantes?: number }
    lowStockItems?: Array<{ SKU: string; Producto: string; Existencia: number }>
  }>>(`/api/v1/reports/dashboard${suffix}`)
  const data = body.data
  return {
    summary: {
      orders: amount(data.summary.Pedidos),
      sales: amount(data.summary.Ventas),
      averageTicket: amount(data.summary.TicketPromedio),
    },
    salesByDay: (data.salesByDay ?? []).map((point) => ({
      period: String(point.Periodo),
      orders: amount(point.Pedidos),
      sales: amount(point.Ventas),
    })),
    salesByCategory: (data.salesByCategory ?? []).map((item) => ({
      category: item.Categoria,
      units: amount(item.Unidades),
      sales: amount(item.Ventas),
    })),
    topProducts: (data.topProducts ?? []).map((item) => ({
      sku: item.SKUSnapshot,
      name: item.NombreSnapshot,
      units: amount(item.Unidades),
      sales: amount(item.Ventas),
    })),
    statuses: (data.statuses ?? []).map((item) => ({ status: item.Estado, count: amount(item.Cantidad) })),
    abandonedCarts: amount(data.abandonedCarts?.CarritosAbandonados),
    inactiveMinutes: amount(data.abandonedCarts?.MinutosSinActividad),
    attention: {
      confirmed: amount(data.attention?.Confirmado),
      preparing: amount(data.attention?.Preparando),
      dispatched: amount(data.attention?.Despachado),
      onRoute: amount(data.attention?.EnRuta),
    },
    losses: {
      cancelledOrders: amount(data.losses?.PedidosCancelados),
      cancelledAmount: amount(data.losses?.MontoCancelado),
      returnedAmount: amount(data.losses?.MontoDevuelto),
      returnedOrders: amount(data.losses?.PedidosConDevolucion),
    },
    lowStockThreshold: data.lowStock?.Umbral == null ? 5 : amount(data.lowStock.Umbral),
    lowStockCount: amount(data.lowStock?.Variantes),
    lowStockItems: (data.lowStockItems ?? []).map((item) => ({
      sku: item.SKU,
      product: item.Producto,
      stock: amount(item.Existencia),
    })),
  }
}

export async function listAdminCategories(): Promise<Category[]> {
  const body = await api<Envelope<Category[]>>('/api/v1/catalog/admin/categories')
  return body.data
}

export async function createCategory(name: string): Promise<void> {
  await api('/api/v1/catalog/admin/categories', { method: 'POST', body: { name } })
}

export async function updateCategory(categoryId: number, input: { name?: string; active?: boolean }): Promise<void> {
  await api(`/api/v1/catalog/admin/categories/${categoryId}`, { method: 'PATCH', body: input })
}

export async function listAdminProducts(query: ProductQuery = {}): Promise<{ products: ProductSummary[]; pagination: PageInfo }> {
  const body = await api<Envelope<CatalogListPayload>>(`/api/v1/catalog/admin/products?${toQuery(query)}`)
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

export interface CatalogAttribute {
  id: number
  name: string
  inUse?: boolean
}

export async function listAttributes(): Promise<CatalogAttribute[]> {
  const body = await api<Envelope<CatalogAttribute[]>>('/api/v1/catalog/attributes')
  return body.data
}

export async function createAttribute(name: string): Promise<CatalogAttribute> {
  const body = await api<Envelope<CatalogAttribute>>('/api/v1/catalog/admin/attributes', {
    method: 'POST',
    body: { name },
  })
  return body.data
}

export async function updateAttribute(attributeId: number, name: string): Promise<void> {
  await api(`/api/v1/catalog/admin/attributes/${attributeId}`, { method: 'PATCH', body: { name } })
}

export async function deleteAttribute(attributeId: number): Promise<void> {
  await api(`/api/v1/catalog/admin/attributes/${attributeId}`, { method: 'DELETE' })
}

export async function getAdminProduct(productId: number): Promise<ProductDetail> {
  const body = await api<Envelope<ProductDetail>>(`/api/v1/catalog/admin/products/${productId}`)
  return body.data
}

export async function uploadCatalogPhoto(file: File): Promise<string> {
  const body = new FormData()
  body.append('photo', file)
  const response = await api<Envelope<{ url: string }>>('/api/v1/catalog/admin/photos', {
    method: 'POST',
    body,
  })
  return response.data.url
}

export async function setVariantActive(productId: number, variantId: number, active: boolean): Promise<void> {
  await api(`/api/v1/catalog/admin/products/${productId}/variants/${variantId}/status`, {
    method: 'PATCH',
    body: { active },
  })
}

export async function saveVariant(productId: number, input: {
  variantId?: number
  sku: string
  price: number
  stock: number
  imageUrl: string | null
  attributes: Array<{ attributeId: number; value: string }>
}): Promise<void> {
  const path = input.variantId
    ? `/api/v1/catalog/admin/products/${productId}/variants/${input.variantId}`
    : `/api/v1/catalog/admin/products/${productId}/variants`
  await api(path, {
    method: input.variantId ? 'PUT' : 'POST',
    body: {
      sku: input.sku,
      price: input.price,
      stock: input.stock,
      imageUrl: input.imageUrl ?? '',
      attributes: input.attributes,
    },
  })
}

export async function createProduct(input: {
  categoryId: number
  name: string
  description: string | null
  imageUrl?: string | null
}): Promise<number> {
  const body = await api<Envelope<{ id: number }>>('/api/v1/catalog/admin/products', {
    method: 'POST',
    body: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      variants: [],
      images: input.imageUrl ? [{ url: input.imageUrl, order: 0 }] : [],
    },
  })
  return body.data.id
}

export async function updateProduct(productId: number, input: { active?: boolean; name?: string; categoryId?: number }): Promise<void> {
  await api(`/api/v1/catalog/admin/products/${productId}`, { method: 'PATCH', body: input })
}

export async function listUsers(query: { page?: number; search?: string; role?: string } = {}): Promise<{
  users: AdminUser[]
  pagination: PageInfo
}> {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', '10')
  if (query.search) params.set('search', query.search)
  if (query.role) params.set('role', query.role)
  const body = await api<Envelope<{
    data: Array<{ IDUsuario: number; Correo: string; Nombre: string; Rol: UserRole; Activo: boolean | number; FechaCreacion: string }>
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number }
  }>>(`/api/v1/users?${params.toString()}`)
  return {
    users: body.data.data.map((user) => ({
      id: user.IDUsuario,
      email: user.Correo,
      name: user.Nombre,
      role: user.Rol,
      active: flag(user.Activo),
      createdAt: String(user.FechaCreacion),
    })),
    pagination: {
      page: body.data.pagination.page,
      pageSize: body.data.pagination.pageSize,
      total: body.data.pagination.totalRecords,
      totalPages: body.data.pagination.totalPages,
    },
  }
}

export async function createStaffUser(input: {
  name: string
  email: string
  password: string
  role: 'Operador' | 'Administrador'
  line1: string
  municipality: string
  department: string
  phone: string
}): Promise<void> {
  await api('/api/v1/users', { method: 'POST', body: input })
}

export async function setUserActive(userId: number, active: boolean): Promise<void> {
  await api(`/api/v1/users/${userId}/status`, { method: 'PATCH', body: { active } })
}

export interface AdminUserDetail extends AdminUser {
  addresses: Array<{
    id: number
    alias: string
    line1: string
    line2: string | null
    municipality: string
    department: string
    phone: string
  }>
}

export async function getAdminUser(userId: number): Promise<AdminUserDetail> {
  const body = await api<Envelope<AdminUserDetail>>(`/api/v1/users/${userId}`)
  return body.data
}

export async function updateUser(userId: number, input: { name?: string; email?: string }): Promise<void> {
  await api(`/api/v1/users/${userId}`, { method: 'PATCH', body: input })
}

export async function listCoupons(page = 1, search = ''): Promise<{ coupons: Coupon[]; pagination: PageInfo }> {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' })
  const query = search.trim()
  if (query) params.set('search', query)
  const body = await api<{ data: Coupon[]; pagination: PageInfo }>(`/api/v1/coupons?${params.toString()}`)
  return { coupons: body.data, pagination: body.pagination }
}

export async function createCoupon(input: {
  code: string
  type: 'PORCENTAJE' | 'MONTO'
  value: number
  minimumAmount: number
  validFrom: string
  validUntil: string
  totalUsageLimit: number
  usageLimitPerCustomer: number
  categoryId: number | null
}): Promise<void> {
  await api('/api/v1/coupons', { method: 'POST', body: input })
}

export async function updateCoupon(couponId: number, input: {
  minimumAmount?: number
  validFrom?: string
  validUntil?: string
  totalUsageLimit?: number
  usageLimitPerCustomer?: number
  categoryId?: number | null
  active?: boolean
}): Promise<void> {
  await api(`/api/v1/coupons/${couponId}`, { method: 'PATCH', body: input })
}

export async function setCouponActive(couponId: number, active: boolean): Promise<void> {
  await updateCoupon(couponId, { active })
}

export async function listMovements(query: { page?: number; variantId?: number; type?: string } = {}): Promise<{ movements: StockMovement[]; pagination: PageInfo }> {
  const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: '10' })
  if (query.variantId) params.set('variantId', String(query.variantId))
  if (query.type) params.set('type', query.type)
  const body = await api<{ data: StockMovement[]; pagination: PageInfo }>(`/api/v1/inventory/movements?${params.toString()}`)
  return { movements: body.data, pagination: body.pagination }
}

export async function adjustStock(variantId: number, stock: number, reason: string): Promise<void> {
  await api(`/api/v1/inventory/variants/${variantId}/stock`, { method: 'PATCH', body: { stock, reason } })
}

export interface AuditSummary {
  byModule: Array<{ name: string; count: number }>
  byAction: Array<{ name: string; count: number }>
  byDay: Array<{ date: string; count: number }>
}

export async function getAuditSummary(): Promise<AuditSummary> {
  const body = await api<Envelope<AuditSummary>>('/api/v1/audit/summary')
  return body.data
}

export async function listAudit(page = 1, module?: string): Promise<{ entries: AuditEntry[]; pagination: PageInfo }> {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' })
  if (module) params.set('module', module)
  const body = await api<{
    data: Array<{
      IDBitacora: number
      IDUsuario: number | null
      Correo: string | null
      Modulo: string
      Entidad: string
      IDEntidad: number | null
      Accion: string
      ValorAnterior: string | null
      ValorNuevo: string | null
      Fecha: string
    }>
    pagination: PageInfo
  }>(`/api/v1/audit?${params.toString()}`)
  return {
    entries: body.data.map((entry) => ({
      id: entry.IDBitacora,
      userId: entry.IDUsuario,
      email: entry.Correo,
      module: entry.Modulo,
      entity: entry.Entidad,
      entityId: entry.IDEntidad,
      action: entry.Accion,
      previous: entry.ValorAnterior,
      next: entry.ValorNuevo,
      createdAt: String(entry.Fecha),
    })),
    pagination: body.pagination,
  }
}

export async function listSettings(): Promise<Setting[]> {
  const body = await api<Envelope<Setting[]>>('/api/v1/configuration')
  return body.data
}

export async function updateSetting(key: string, value: string, description: string | null): Promise<void> {
  await api(`/api/v1/configuration/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: { value, description },
  })
}

export async function createSetting(input: { key: string; value: string; description: string | null }): Promise<void> {
  await api('/api/v1/configuration', { method: 'POST', body: input })
}

export function toApiDateTime(value: string): string {
  return new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z')
}
