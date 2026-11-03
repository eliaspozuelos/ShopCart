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

export interface DashboardSnapshot {
  summary: ReportSummaryRecord | Record<string, never>;
  salesByDay: ReportPeriodRecord[];
  salesByWeek: ReportPeriodRecord[];
  salesByMonth: ReportPeriodRecord[];
  salesByCategory: ReportCategoryRecord[];
  topProducts: ReportProductRecord[];
  statuses: ReportStatusRecord[];
  abandonedCarts: ReportAbandonedRecord | Record<string, never>;
}
