import { HttpError } from '../../utils/http-error.js';
import { InventoryRepository } from './inventory.repository.js';
import {
  toInventoryMovementResponse,
  toInventoryStockResponse,
  type InventoryMovementResponse,
  type InventoryStockResponse,
} from './inventory.types.js';

export class InventoryService {
  constructor(private readonly inventoryRepository = new InventoryRepository()) {}

  async getStock(variantId: number, actorId: number): Promise<InventoryStockResponse> {
    const record = await this.inventoryRepository.getStock(variantId, actorId);
    if (!record) {
      throw new HttpError(404, 'INVENTORY_VARIANT_NOT_FOUND', 'No se encontró la variante de inventario.');
    }
    return toInventoryStockResponse(record);
  }

  async adjustStock(input: {
    variantId: number;
    actorId: number;
    stock: number;
    reason: string;
  }): Promise<InventoryStockResponse> {
    return toInventoryStockResponse(await this.inventoryRepository.adjustStock(input));
  }

  async listMovements(input: {
    actorId: number;
    variantId?: number | undefined;
    page: number;
    pageSize: number;
  }): Promise<{
    data: InventoryMovementResponse[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const result = await this.inventoryRepository.listMovements(input);
    return {
      data: result.movements.map(toInventoryMovementResponse),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize) || 1,
      },
    };
  }
}
