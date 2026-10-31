import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  adjustInventorySchema,
  inventoryMovementsQuerySchema,
  inventoryVariantParamsSchema,
} from './inventory.schemas.js';
import { InventoryService } from './inventory.service.js';

export class InventoryController {
  constructor(private readonly inventoryService = new InventoryService()) {}

  getStock = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { variantId } = inventoryVariantParamsSchema.parse(request.params);
    const data = await this.inventoryService.getStock(variantId, actorId);
    response.status(200).json({ data });
  };

  adjustStock = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { variantId } = inventoryVariantParamsSchema.parse(request.params);
    const input = adjustInventorySchema.parse(request.body);
    const data = await this.inventoryService.adjustStock({ ...input, actorId, variantId });
    response.status(200).json({
      message: 'Existencia actualizada y movimiento registrado.',
      data,
    });
  };

  listMovements = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const query = inventoryMovementsQuerySchema.parse(request.query);
    const result = await this.inventoryService.listMovements({ ...query, actorId });
    response.status(200).json(result);
  };

  private getActorId(request: Request): number {
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }
    return actorId;
  }
}
