import { OrdersRepository } from '../orders/orders.repository.js';
import { invalidateReportCache } from '../reports/reports.service.js';

export class ReturnsService {
  constructor(private readonly repository = new OrdersRepository()) {}

  async create(input: Parameters<OrdersRepository['createReturn']>[0]) {
    return this.repository.createReturn(input);
  }

  async resolve(input: Parameters<OrdersRepository['resolveReturn']>[0]) {
    const result = await this.repository.resolveReturn(input);
    invalidateReportCache();
    return result;
  }
}
