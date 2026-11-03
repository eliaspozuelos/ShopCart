export interface OrderRecord {
  IDPedido: number;
  NumeroPedido: string;
  IDUsuario: number;
  Estado: string;
  DireccionSnapshot?: string;
  CodigoCuponSnapshot?: string | null;
  Subtotal: number;
  Descuento: number;
  Total: number;
  MontoIVA?: number;
  FechaCreacion: string;
  Metodo?: string;
  EstadoPago?: string;
}

export interface OrderDetailRecord {
  IDPedidoDetalle: number;
  IDVariante: number;
  IDCategoriaSnapshot: number;
  SKUSnapshot: string;
  NombreSnapshot: string;
  Cantidad: number;
  PrecioUnitario: number;
  DescuentoLinea: number;
  TotalLinea: number;
  CantidadDevuelta: number;
}

export interface ReturnRecord {
  IDDevolucion: number;
  IDPedido: number;
  IDUsuario: number;
  Motivo: string;
  MontoReintegrado: number;
  Fecha: string;
}
