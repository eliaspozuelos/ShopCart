import { HttpError } from '../../utils/http-error.js';
import { invalidateReportCache } from '../reports/reports.service.js';
import { OrdersRepository } from './orders.repository.js';

export class OrdersService {
  constructor(private readonly repository = new OrdersRepository()) {}

  async get(orderId: number, userId?: number) {
    const result = await this.repository.get(orderId, userId);
    if (!result.order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'No se encontró el pedido.');
    const returns = await this.repository.listReturns(orderId);
    return { order: result.order, details: result.details, returns };
  }

  async list(input: Parameters<OrdersRepository['list']>[0]) {
    const result = await this.repository.list(input);
    return { data: result.orders, pagination: { page: input.page, pageSize: input.pageSize, total: result.total, totalPages: Math.ceil(result.total / input.pageSize) || 1 } };
  }

  async changeStatus(input: Parameters<OrdersRepository['changeStatus']>[0]) {
    const order = await this.repository.changeStatus(input);
    if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'No se encontró el pedido.');
    invalidateReportCache();
    return order;
  }

}
