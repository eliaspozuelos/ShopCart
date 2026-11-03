import { OrdersRepository } from '../orders/orders.repository.js';

export class CheckoutService {
  constructor(private readonly repository = new OrdersRepository()) {}

  async checkout(input: Parameters<OrdersRepository['checkout']>[0]) {
    return this.repository.checkout(input);
  }
}
