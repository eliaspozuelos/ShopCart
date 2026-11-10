import sql from 'mssql';
import { getDatabase } from '../../config/database.js';

export class AuditRepository {
  async list(input: { module?: string | undefined; page: number; pageSize: number }): Promise<{ total: number; entries: unknown[] }> {
    const result = await (await getDatabase()).request()
      .input('Modulo', sql.NVarChar(30), input.module ?? null)
      .input('Pagina', sql.Int, input.page)
      .input('TamanoPagina', sql.Int, input.pageSize)
      .execute<[ { TotalRegistros: number }, unknown]>('dbo.SP_Bitacora_Listar');
    return { total: result.recordsets[0]?.[0]?.TotalRegistros ?? 0, entries: result.recordsets[1] ?? [] };
  }

  async summary(): Promise<{
    byModule: Array<{ name: string; count: number }>;
    byAction: Array<{ name: string; count: number }>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const result = await (await getDatabase()).request()
      .execute<[CountRow, CountRow, DayRow]>('dbo.SP_Bitacora_Resumen');
    return {
      byModule: (result.recordsets[0] ?? []).map(toCount),
      byAction: (result.recordsets[1] ?? []).map(toCount),
      byDay: (result.recordsets[2] ?? []).map((row) => ({
        date: String(row.Fecha).slice(0, 10),
        count: Number(row.Total),
      })),
    };
  }
}

interface CountRow {
  Nombre: string;
  Total: number;
}

interface DayRow {
  Fecha: string;
  Total: number;
}

function toCount(row: CountRow): { name: string; count: number } {
  return { name: row.Nombre, count: Number(row.Total) };
}
