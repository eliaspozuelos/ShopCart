import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type { OrderDetailRecord, OrderRecord, ReturnRecord } from './orders.types.js';

export class OrdersRepository {
  async checkout(input: {
    userId: number;
    addressId: number;
    paymentMethod: 'TARJETA' | 'CONTRA_ENTREGA';
    idempotencyKey?: string | undefined;
  }): Promise<{ order: OrderRecord; details: OrderDetailRecord[] }> {
    const request = (await getDatabase()).request()
      .input('IDUsuario', sql.Int, input.userId)
      .input('IDDireccion', sql.Int, input.addressId)
      .input('MetodoPago', sql.NVarChar(30), input.paymentMethod)
      .input('LlaveIdempotencia', sql.UniqueIdentifier, input.idempotencyKey ?? null);
    const result = await request.execute<[OrderRecord, OrderDetailRecord]>('dbo.SP_Pedidos_Checkout');
    const order = result.recordsets[0]?.[0];
    if (!order) throw new Error('SP_Pedidos_Checkout no devolvió el pedido.');
    return { order, details: result.recordsets[1] ?? [] };
  }

  async get(orderId: number, userId?: number): Promise<{ order: OrderRecord | undefined; details: OrderDetailRecord[] }> {
    const result = await (await getDatabase()).request()
      .input('IDPedido', sql.Int, orderId)
      .input('IDUsuario', sql.Int, userId ?? null)
      .execute<[OrderRecord, OrderDetailRecord]>('dbo.SP_Pedidos_Obtener');
    return { order: result.recordsets[0]?.[0], details: result.recordsets[1] ?? [] };
  }

  async list(input: {
    userId?: number | undefined;
    customerId?: number | undefined;
    status?: string | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ total: number; orders: OrderRecord[] }> {
    const result = await (await getDatabase()).request()
      .input('IDUsuario', sql.Int, input.userId ?? null)
      .input('IDCliente', sql.Int, input.customerId ?? null)
      .input('Estado', sql.NVarChar(30), input.status ?? null)
      .input('Desde', sql.DateTime2, input.from ?? null)
      .input('Hasta', sql.DateTime2, input.to ?? null)
      .input('Pagina', sql.Int, input.page)
      .input('TamanoPagina', sql.Int, input.pageSize)
      .execute<[ { TotalRegistros: number }, OrderRecord]>('dbo.SP_Pedidos_Listar');
    return { total: result.recordsets[0]?.[0]?.TotalRegistros ?? 0, orders: result.recordsets[1] ?? [] };
  }

  async changeStatus(input: {
    orderId: number;
    actorId: number;
    status: string;
  }): Promise<OrderRecord | undefined> {
    const result = await (await getDatabase()).request()
      .input('IDPedido', sql.Int, input.orderId)
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('NombreEstadoDestino', sql.NVarChar(30), input.status)
      .execute<OrderRecord>('dbo.SP_Pedidos_CambiarEstado');

    return result.recordset[0];
  }

  async createReturn(input: { orderId: number; userId: number; reason: string; items: Array<{ orderDetailId: number; quantity: number; amount: number }> }): Promise<{ returnRecord: ReturnRecord; details: unknown[] }> {
    const result = await (await getDatabase()).request()
      .input('IDPedido', sql.Int, input.orderId)
      .input('IDUsuario', sql.Int, input.userId)
      .input('Motivo', sql.NVarChar(300), input.reason)
      .input('Detalle', sql.NVarChar(sql.MAX), JSON.stringify(input.items))
      .execute<[ReturnRecord, unknown]>('dbo.SP_Devoluciones_Crear');
    const returnRecord = result.recordsets[0]?.[0];
    if (!returnRecord) throw new Error('SP_Devoluciones_Crear no devolvió la devolución.');
    return { returnRecord, details: result.recordsets[1] ?? [] };
  }
}
