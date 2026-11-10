import { api } from '../../shared/api/client.ts'
import type { PageInfo } from '../catalog/catalog.types.ts'
import type { OrderDetail, OrderLine, OrderReturn, OrderSummary, RawOrder, RawOrderLine, RawOrderReturn } from './orders.types.ts'

interface Envelope<T> {
  data: T
  message?: string
}

function numberValue(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function mapOrder(order: RawOrder): OrderSummary {
  return {
    id: order.IDPedido,
    number: order.NumeroPedido,
    customerId: order.IDUsuario,
    status: order.Estado,
    address: order.DireccionSnapshot,
    couponCode: order.CodigoCuponSnapshot,
    subtotal: numberValue(order.Subtotal),
    discount: numberValue(order.Descuento),
    total: numberValue(order.Total),
    tax: order.MontoIVA === undefined ? undefined : numberValue(order.MontoIVA),
    createdAt: order.FechaCreacion,
    paymentMethod: order.Metodo,
    paymentStatus: order.EstadoPago,
    ...(order.NombreCliente ? { customerName: order.NombreCliente } : {}),
    ...(order.CorreoCliente ? { customerEmail: order.CorreoCliente } : {}),
  }
}

export function mapLine(line: RawOrderLine): OrderLine {
  return {
    id: line.IDPedidoDetalle,
    variantId: line.IDVariante,
    sku: line.SKUSnapshot,
    name: line.NombreSnapshot,
    quantity: line.Cantidad,
    unitPrice: numberValue(line.PrecioUnitario),
    lineDiscount: numberValue(line.DescuentoLinea),
    lineTotal: numberValue(line.TotalLinea),
    returnedQuantity: line.CantidadDevuelta,
  }
}

function mapReturn(entry: RawOrderReturn): OrderReturn {
  return {
    id: entry.IDDevolucion,
    reason: entry.Motivo,
    amount: numberValue(entry.MontoReintegrado),
    status: entry.Estado,
    createdAt: entry.Fecha,
    resolvedAt: entry.FechaResolucion,
    ...(entry.NombreUsuario ? { requestedBy: entry.NombreUsuario } : {}),
    items: (entry.items ?? []).map((item) => ({
      orderDetailId: item.IDPedidoDetalle,
      quantity: item.Cantidad,
      amount: numberValue(item.Monto),
      name: item.NombreSnapshot,
      sku: item.SKUSnapshot,
    })),
  }
}

function mapDetail(payload: { order: RawOrder; details: RawOrderLine[]; returns?: RawOrderReturn[] }): OrderDetail {
  return { order: mapOrder(payload.order), lines: payload.details.map(mapLine), returns: (payload.returns ?? []).map(mapReturn) }
}

export async function listOrders(query: { page?: number; pageSize?: number; status?: string; customer?: string; from?: string; to?: string } = {}): Promise<{
  orders: OrderSummary[]
  pagination: PageInfo
}> {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 10))
  if (query.status) params.set('status', query.status)
  if (query.customer) params.set('customer', query.customer)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  const body = await api<{ data: RawOrder[]; pagination: PageInfo }>(`/api/v1/orders?${params.toString()}`)
  return { orders: body.data.map(mapOrder), pagination: body.pagination }
}

export async function getOrder(orderId: number): Promise<OrderDetail> {
  const body = await api<Envelope<{ order: RawOrder; details: RawOrderLine[]; returns?: RawOrderReturn[] }>>(`/api/v1/orders/${orderId}`)
  return mapDetail(body.data)
}

export async function checkout(input: {
  addressId: number
  paymentMethod: 'TARJETA' | 'CONTRA_ENTREGA'
  idempotencyKey: string
}): Promise<OrderDetail> {
  const body = await api<Envelope<{ order: RawOrder; details: RawOrderLine[] }>>('/api/v1/orders/checkout', {
    method: 'POST',
    body: input,
  })
  return mapDetail(body.data)
}

export async function cancelOrder(orderId: number): Promise<void> {
  await api(`/api/v1/orders/${orderId}/cancel`, { method: 'POST' })
}

export async function changeOrderStatus(orderId: number, status: string): Promise<void> {
  await api(`/api/v1/orders/${orderId}/status`, { method: 'PATCH', body: { status } })
}

export async function resolveReturn(orderId: number, returnId: number, decision: 'APROBAR' | 'RECHAZAR'): Promise<void> {
  await api(`/api/v1/orders/${orderId}/returns/${returnId}`, { method: 'PATCH', body: { decision } })
}

export async function createReturn(orderId: number, input: {
  reason: string
  items: Array<{ orderDetailId: number; quantity: number; amount: number }>
}): Promise<void> {
  await api(`/api/v1/orders/${orderId}/returns`, { method: 'POST', body: input })
}
