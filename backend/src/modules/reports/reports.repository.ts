import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type {
  DashboardSnapshot,
  ReportAbandonedRecord,
  ReportCategoryRecord,
  ReportDayCategoryRecord,
  ReportPeriodRecord,
  ReportProductRecord,
  ReportAttentionRecord,
  ReportLossRecord,
  ReportStatusRecord,
  ReportStockRecord,
  ReportStockSummaryRecord,
  ReportSummaryRecord,
} from './reports.types.js';

export class ReportsRepository {
  async dashboard(from?: Date, to?: Date): Promise<DashboardSnapshot> {
    const result = await (await getDatabase()).request()
      .input('Desde', sql.DateTime2, from ?? null)
      .input('Hasta', sql.DateTime2, to ?? null)
      .execute<[
        ReportSummaryRecord,
        ReportPeriodRecord,
        ReportPeriodRecord,
        ReportPeriodRecord,
        ReportCategoryRecord,
        ReportProductRecord,
        ReportStatusRecord,
        ReportAbandonedRecord,
        ReportAttentionRecord,
        ReportLossRecord,
        ReportStockSummaryRecord,
        ReportStockRecord,
        ReportDayCategoryRecord,
      ]>('dbo.SP_Reportes_Dashboard');

    return {
      summary: result.recordsets[0]?.[0] ?? {},
      salesByDay: result.recordsets[1] ?? [],
      salesByWeek: result.recordsets[2] ?? [],
      salesByMonth: result.recordsets[3] ?? [],
      salesByCategory: result.recordsets[4] ?? [],
      salesByDayCategory: result.recordsets[12] ?? [],
      topProducts: result.recordsets[5] ?? [],
      statuses: result.recordsets[6] ?? [],
      abandonedCarts: result.recordsets[7]?.[0] ?? {},
      attention: result.recordsets[8]?.[0] ?? {},
      losses: result.recordsets[9]?.[0] ?? {},
      lowStock: result.recordsets[10]?.[0] ?? {},
      lowStockItems: result.recordsets[11] ?? [],
    };
  }
}
