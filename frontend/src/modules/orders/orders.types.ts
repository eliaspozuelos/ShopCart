export interface OrderSummary {
  id: number
  number: string
  customerId: number
  status: string
  address?: string
  couponCode?: string | null
  subtotal: number
  discount: number
  total: number
  tax?: number
  createdAt: string
  paymentMethod?: string
  paymentStatus?: string
  customerName?: string
  customerEmail?: string
}

export interface OrderLine {
  id: number
  variantId: number
  sku: string
  name: string
  quantity: number
  unitPrice: number
  lineDiscount: number
  lineTotal: number
  returnedQuantity: number
}

export interface OrderReturnItem {
  orderDetailId: number
  quantity: number
  amount: number
  name: string
  sku: string
}

export interface OrderReturn {
  id: number
  reason: string
  amount: number
  status: string
  createdAt: string
  resolvedAt?: string | null
  requestedBy?: string
  items: OrderReturnItem[]
}

export interface OrderDetail {
  order: OrderSummary
  lines: OrderLine[]
  returns: OrderReturn[]
}

export interface RawOrder {
  IDPedido: number
  NumeroPedido: string
  IDUsuario: number
  Estado: string
  DireccionSnapshot?: string
  CodigoCuponSnapshot?: string | null
  Subtotal: number | string
  Descuento: number | string
  Total: number | string
  MontoIVA?: number | string
  FechaCreacion: string
  Metodo?: string
  EstadoPago?: string
  NombreCliente?: string
  CorreoCliente?: string
}

export interface RawOrderReturnItem {
  IDPedidoDetalle: number
  Cantidad: number
  Monto: number | string
  NombreSnapshot: string
  SKUSnapshot: string
}

export interface RawOrderReturn {
  IDDevolucion: number
  Motivo: string
  MontoReintegrado: number | string
  Estado: string
  Fecha: string
  FechaResolucion?: string | null
  NombreUsuario?: string
  items?: RawOrderReturnItem[]
}

export interface RawOrderLine {
  IDPedidoDetalle: number
  IDVariante: number
  SKUSnapshot: string
  NombreSnapshot: string
  Cantidad: number
  PrecioUnitario: number | string
  DescuentoLinea: number | string
  TotalLinea: number | string
  CantidadDevuelta: number
}
