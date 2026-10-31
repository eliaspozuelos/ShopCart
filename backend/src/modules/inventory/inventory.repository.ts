import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type { InventoryMovementRecord, InventoryStockRecord } from './inventory.types.js';

interface InventoryMovementCountRecord {
  TotalRegistros: number;
}

export class InventoryRepository {
  async getStock(variantId: number, actorId: number): Promise<InventoryStockRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, actorId)
      .input('IDVariante', sql.Int, variantId)
      .execute<InventoryStockRecord>('dbo.SP_Inventario_ObtenerExistencia');
    return result.recordset[0];
  }

  async adjustStock(input: {
    variantId: number;
    actorId: number;
    stock: number;
    reason: string;
  }): Promise<InventoryStockRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDVariante', sql.Int, input.variantId)
      .input('NuevaExistencia', sql.Int, input.stock)
      .input('Motivo', sql.NVarChar(300), input.reason)
      .execute<InventoryStockRecord>('dbo.SP_Inventario_AjustarExistencia');
    const record = result.recordset[0];
    if (!record) throw new Error('SP_Inventario_AjustarExistencia no devolvió la existencia actualizada.');
    return record;
  }

  async listMovements(input: {
    actorId: number;
    variantId?: number | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ total: number; movements: InventoryMovementRecord[] }> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDVariante', sql.Int, input.variantId ?? null)
      .input('Pagina', sql.Int, input.page)
      .input('TamanoPagina', sql.Int, input.pageSize)
      .execute<[InventoryMovementCountRecord, InventoryMovementRecord]>('dbo.SP_Inventario_ListarMovimientos');
    const total = result.recordsets[0]?.[0]?.TotalRegistros;
    const movements = result.recordsets[1];
    if (total === undefined || !movements) {
      throw new Error('SP_Inventario_ListarMovimientos no devolvió los resultados esperados.');
    }
    return { total, movements };
  }
}
