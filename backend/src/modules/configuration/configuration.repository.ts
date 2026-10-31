import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type { ConfigurationRecord, CurrencyMetadata } from './configuration.types.js';

export class ConfigurationRepository {
  async getCurrencyMetadata(): Promise<CurrencyMetadata> {
    const database = await getDatabase();
    const result = await database.request()
      .execute<{ Clave: string; Valor: string }>('dbo.SP_Configuracion_ObtenerMoneda');
    const values = new Map(result.recordset.map(({ Clave, Valor }) => [Clave, Valor]));
    return {
      currency: values.get('MONEDA') ?? 'GTQ',
      currencySymbol: values.get('SIMBOLO_MONEDA') ?? 'Q',
    };
  }

  async list(actorId: number): Promise<ConfigurationRecord[]> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, actorId)
      .execute<ConfigurationRecord>('dbo.SP_Configuracion_Listar');
    return result.recordset;
  }

  async create(input: {
    actorId: number;
    key: string;
    value: string;
    description: string | null;
  }): Promise<ConfigurationRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Clave', sql.NVarChar(50), input.key)
      .input('Valor', sql.NVarChar(100), input.value)
      .input('Descripcion', sql.NVarChar(200), input.description)
      .execute<ConfigurationRecord>('dbo.SP_Configuracion_Crear');
    const record = result.recordset[0];
    if (!record) throw new Error('SP_Configuracion_Crear did not return the created configuration.');
    return record;
  }

  async update(input: {
    actorId: number;
    key: string;
    value: string;
    description?: string | null | undefined;
  }): Promise<ConfigurationRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Clave', sql.NVarChar(50), input.key)
      .input('Valor', sql.NVarChar(100), input.value)
      .input('Descripcion', sql.NVarChar(200), input.description ?? null)
      .input('ActualizarDescripcion', sql.Bit, input.description !== undefined)
      .execute<ConfigurationRecord>('dbo.SP_Configuracion_Actualizar');
    const record = result.recordset[0];
    if (!record) throw new Error('SP_Configuracion_Actualizar did not return the updated configuration.');
    return record;
  }
}
