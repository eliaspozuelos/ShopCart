import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type {
  CartHeaderRecord,
  CartItemAttributeRecord,
  CartItemRecord,
} from './cart.types.js';

export interface CartSnapshot {
  header: CartHeaderRecord;
  items: CartItemRecord[];
  attributes: CartItemAttributeRecord[];
}

export class CartRepository {
  async getCart(input: { userId?: number | undefined; guestToken?: string | undefined }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_Obtener', input);
  }

  async addItem(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    variantId: number;
    quantity: number;
  }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_AgregarItem', input, (request) => {
      request.input('IDVariante', sql.Int, input.variantId);
      request.input('Cantidad', sql.Int, input.quantity);
    });
  }

  async updateItem(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    itemId: number;
    quantity: number;
  }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_ActualizarItem', input, (request) => {
      request.input('IDCarritoDetalle', sql.Int, input.itemId);
      request.input('Cantidad', sql.Int, input.quantity);
    });
  }

  async removeItem(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    itemId: number;
  }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_EliminarItem', input, (request) => {
      request.input('IDCarritoDetalle', sql.Int, input.itemId);
    });
  }

  async applyCoupon(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    code: string;
  }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_AplicarCupon', input, (request) => {
      request.input('Codigo', sql.NVarChar(30), input.code);
    });
  }

  async removeCoupon(input: { userId?: number | undefined; guestToken?: string | undefined }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_QuitarCupon', input);
  }

  async clearCart(input: { userId?: number | undefined; guestToken?: string | undefined }): Promise<CartSnapshot> {
    return this.executeCartProcedure('dbo.SP_Carrito_Vaciar', input);
  }

  private async executeCartProcedure(
    procedureName: string,
    owner: { userId?: number | undefined; guestToken?: string | undefined },
    bindExtra?: (request: sql.Request) => void,
  ): Promise<CartSnapshot> {
    const database = await getDatabase();
    const request = database.request()
      .input('IDUsuario', sql.Int, owner.userId ?? null)
      .input('TokenInvitado', sql.UniqueIdentifier, owner.guestToken ?? null);

    bindExtra?.(request);

    const result = await request.execute<[CartHeaderRecord, CartItemRecord, CartItemAttributeRecord]>(procedureName);
    const header = result.recordsets[0]?.[0];
    if (!header) {
      throw new Error(`${procedureName} no devolvió el carrito.`);
    }

    return {
      header,
      items: result.recordsets[1] ?? [],
      attributes: result.recordsets[2] ?? [],
    };
  }
}
