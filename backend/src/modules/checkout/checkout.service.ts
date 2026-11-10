import { OrdersRepository } from '../orders/orders.repository.js';
import { invalidateReportCache } from '../reports/reports.service.js';

export class CheckoutService {
  constructor(private readonly repository = new OrdersRepository()) {}

  async checkout(input: Parameters<OrdersRepository['checkout']>[0]) {
    const order = await this.repository.checkout(input);
    invalidateReportCache();
    return order;
  }
}
