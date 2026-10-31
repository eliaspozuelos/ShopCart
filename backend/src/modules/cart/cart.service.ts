import { CartRepository } from './cart.repository.js';
import { toCartResponse, type CartResponse } from './cart.types.js';
import { ConfigurationRepository } from '../configuration/configuration.repository.js';

export class CartService {
  constructor(
    private readonly cartRepository = new CartRepository(),
    private readonly configurationRepository = new ConfigurationRepository(),
  ) {}

  async getCart(owner: { userId?: number | undefined; guestToken?: string | undefined }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.getCart(owner));
  }

  async addItem(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    variantId: number;
    quantity: number;
  }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.addItem(input));
  }

  async updateItem(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    itemId: number;
    quantity: number;
  }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.updateItem(input));
  }

  async removeItem(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    itemId: number;
  }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.removeItem(input));
  }

  async applyCoupon(input: {
    userId?: number | undefined;
    guestToken?: string | undefined;
    code: string;
  }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.applyCoupon(input));
  }

  async removeCoupon(owner: { userId?: number | undefined; guestToken?: string | undefined }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.removeCoupon(owner));
  }

  async clearCart(owner: { userId?: number | undefined; guestToken?: string | undefined }): Promise<CartResponse> {
    return this.toResponse(await this.cartRepository.clearCart(owner));
  }

  private async toResponse(snapshot: Awaited<ReturnType<CartRepository['getCart']>>): Promise<CartResponse> {
    const currency = await this.configurationRepository.getCurrencyMetadata();
    return toCartResponse(snapshot.header, snapshot.items, snapshot.attributes, currency);
  }
}
