import { OrdersRepository } from '../orders/orders.repository.js';

export class ReturnsService {
  constructor(private readonly repository = new OrdersRepository()) {}

  async create(input: Parameters<OrdersRepository['createReturn']>[0]) {
    return this.repository.createReturn(input);
  }
}
