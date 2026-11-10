import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import { changeOrderStatusSchema, listOrdersSchema, orderIdParamsSchema } from './orders.schemas.js';
import { OrdersService } from './orders.service.js';

export class OrdersController {
  constructor(private readonly service = new OrdersService()) {}

  get = async (request: Request, response: Response): Promise<void> => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    console.info('Consultando pedido.', { orderId, userId: request.auth?.userId });
    response.json({
      data: await this.service.get(orderId, request.auth?.role === 'Cliente' ? this.userId(request) : undefined),
    });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const input = listOrdersSchema.parse(request.query);
    const isCustomer = request.auth?.role === 'Cliente';
    response.json(await this.service.list({
      page: input.page,
      pageSize: input.pageSize,
      ...(input.status ? { status: input.status } : {}),
      ...(isCustomer ? { userId: this.userId(request) } : {}),
      ...(!isCustomer && input.customerId ? { customerId: input.customerId } : {}),
      ...(!isCustomer && input.customer ? { customer: input.customer } : {}),
      ...(input.from ? { from: input.from } : {}),
      ...(input.to ? { to: input.to } : {}),
    }));
  };

  changeStatus = async (request: Request, response: Response): Promise<void> => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const { status } = changeOrderStatusSchema.parse(request.body);
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const order = await this.service.changeStatus({ orderId, actorId, status });
    response.status(200).json({
      message: 'El estado del pedido se actualizó correctamente.',
      data: order,
    });
  };

  cancel = async (request: Request, response: Response): Promise<void> => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const actorId = this.userId(request);
    const order = await this.service.changeStatus({ orderId, actorId, status: 'CANCELADO' });
    response.status(200).json({
      message: 'Pedido cancelado. La existencia volvió al inventario.',
      data: order,
    });
  };

  private userId(request: Request): number {
    if (!request.auth?.userId) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    return request.auth.userId;
  }
}
