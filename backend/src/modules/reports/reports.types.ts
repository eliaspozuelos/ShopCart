export interface ReportSummaryRecord {
  Pedidos: number;
  Ventas: number;
  TicketPromedio: number;
}

export interface ReportPeriodRecord {
  Periodo: string | Date;
  Pedidos: number;
  Ventas: number;
}

export interface ReportCategoryRecord {
  Categoria: string;
  Unidades: number;
  Ventas: number;
}

export interface ReportDayCategoryRecord {
  Periodo: string | Date;
  Categoria: string;
  Unidades: number;
  Ventas: number;
}

export interface ReportProductRecord {
  SKUSnapshot: string;
  NombreSnapshot: string;
  Unidades: number;
  Ventas: number;
}

export interface ReportStatusRecord {
  Estado: string;
  Cantidad: number;
}

export interface ReportAbandonedRecord {
  CarritosAbandonados: number;
  MinutosSinActividad: number;
}

export interface ReportAttentionRecord {
  Confirmado: number;
  Preparando: number;
  Despachado: number;
  EnRuta: number;
}

export interface ReportLossRecord {
  PedidosCancelados: number;
  MontoCancelado: number;
  MontoDevuelto: number;
  PedidosConDevolucion: number;
}

export interface ReportStockSummaryRecord {
  Umbral: number;
  Variantes: number;
}

export interface ReportStockRecord {
  SKU: string;
  Producto: string;
  Existencia: number;
}

export interface DashboardSnapshot {
  summary: ReportSummaryRecord | Record<string, never>;
  salesByDay: ReportPeriodRecord[];
  salesByWeek: ReportPeriodRecord[];
  salesByMonth: ReportPeriodRecord[];
  salesByCategory: ReportCategoryRecord[];
  salesByDayCategory: ReportDayCategoryRecord[];
  topProducts: ReportProductRecord[];
  statuses: ReportStatusRecord[];
  abandonedCarts: ReportAbandonedRecord | Record<string, never>;
  attention: ReportAttentionRecord | Record<string, never>;
  losses: ReportLossRecord | Record<string, never>;
  lowStock: ReportStockSummaryRecord | Record<string, never>;
  lowStockItems: ReportStockRecord[];
}
