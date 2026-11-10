import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import { OrdersService } from '../orders/orders.service.js';
import { createReturnSchema, resolveReturnSchema, returnIdParamsSchema, returnOrderParamsSchema } from './returns.schemas.js';
import { ReturnsService } from './returns.service.js';

export class ReturnsController {
  constructor(
    private readonly service = new ReturnsService(),
    private readonly ordersService = new OrdersService(),
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const userId = request.auth?.userId;
    if (!userId) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    const { orderId } = returnOrderParamsSchema.parse(request.params);
    const input = createReturnSchema.parse(request.body);
    if (request.auth?.role === 'Cliente') await this.ordersService.get(orderId, userId);
    const data = await this.service.create({ orderId, userId, reason: input.reason, items: input.items });
    response.status(201).json({ message: 'Solicitud de devolución registrada. El inventario se reintegra cuando se aprueba.', data });
  };

  resolve = async (request: Request, response: Response): Promise<void> => {
    const userId = request.auth?.userId;
    if (!userId) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    const { orderId, returnId } = returnIdParamsSchema.parse(request.params);
    const input = resolveReturnSchema.parse(request.body);
    const data = await this.service.resolve({ orderId, returnId, userId, decision: input.decision });
    response.status(200).json({
      message: input.decision === 'APROBAR'
        ? 'Devolución aprobada y existencia reintegrada.'
        : 'Solicitud de devolución rechazada.',
      data,
    });
  };
}
