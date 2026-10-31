export interface InventoryStockRecord {
  IDVariante: number;
  IDProducto: number;
  SKU: string;
  ExistenciaFisica: number;
  CantidadReservada: number;
  ExistenciaDisponible: number;
}

export interface InventoryMovementRecord {
  IDMovimiento: number;
  IDVariante: number;
  SKU: string;
  IDProducto: number;
  NombreProducto: string;
  TipoMovimiento: string;
  Cantidad: number;
  ExistenciaResultante: number;
  Motivo: string;
  Fecha: Date | string;
}

export interface InventoryStockResponse {
  variantId: number;
  productId: number;
  sku: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
}

export interface InventoryMovementResponse {
  id: number;
  variantId: number;
  sku: string;
  productId: number;
  productName: string;
  type: string;
  quantity: number;
  resultingStock: number;
  reason: string;
  createdAt: string;
}

export function toInventoryStockResponse(record: InventoryStockRecord): InventoryStockResponse {
  return {
    variantId: record.IDVariante,
    productId: record.IDProducto,
    sku: record.SKU,
    physicalStock: record.ExistenciaFisica,
    reservedStock: record.CantidadReservada,
    availableStock: record.ExistenciaDisponible,
  };
}

export function toInventoryMovementResponse(record: InventoryMovementRecord): InventoryMovementResponse {
  return {
    id: record.IDMovimiento,
    variantId: record.IDVariante,
    sku: record.SKU,
    productId: record.IDProducto,
    productName: record.NombreProducto,
    type: record.TipoMovimiento,
    quantity: record.Cantidad,
    resultingStock: record.ExistenciaResultante,
    reason: record.Motivo,
    createdAt: record.Fecha instanceof Date ? record.Fecha.toISOString() : String(record.Fecha),
  };
}
