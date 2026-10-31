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
}
