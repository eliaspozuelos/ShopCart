import type { Request, Response } from 'express';
import {
  addCartItemSchema,
  applyCartCouponSchema,
  cartItemParamsSchema,
  guestCartTokenSchema,
  updateCartItemSchema,
} from './cart.schemas.js';
import { CartService } from './cart.service.js';

export class CartController {
  constructor(private readonly cartService = new CartService()) {}

  // Devuelve el carrito actual del cliente o del visitante identificado por su token.
  get = async (request: Request, response: Response): Promise<void> => {
    const cart = await this.cartService.getCart(this.getOwner(request));
    response.status(200).json({ data: cart });
  };

  // Agrega una variante al carrito y devuelve el resumen actualizado.
  addItem = async (request: Request, response: Response): Promise<void> => {
    const input = addCartItemSchema.parse(request.body);
    const cart = await this.cartService.addItem({ ...this.getOwner(request), ...input });
    response.status(200).json({
      message: 'Producto agregado al carrito.',
      data: cart,
    });
  };

  // Cambia la cantidad de un producto que ya pertenece al carrito.
  updateItem = async (request: Request, response: Response): Promise<void> => {
    const { itemId } = cartItemParamsSchema.parse(request.params);
    const input = updateCartItemSchema.parse(request.body);
    const cart = await this.cartService.updateItem({
      ...this.getOwner(request),
      itemId,
      quantity: input.quantity,
    });
    response.status(200).json({
      message: 'Cantidad actualizada.',
      data: cart,
    });
  };

  // Elimina un producto específico sin afectar los demás artículos del carrito.
  removeItem = async (request: Request, response: Response): Promise<void> => {
    const { itemId } = cartItemParamsSchema.parse(request.params);
    const cart = await this.cartService.removeItem({ ...this.getOwner(request), itemId });
    response.status(200).json({
      message: 'Producto eliminado del carrito.',
      data: cart,
    });
  };

  // Asocia un cupón al carrito después de validar sus reglas de uso.
  applyCoupon = async (request: Request, response: Response): Promise<void> => {
    const input = applyCartCouponSchema.parse(request.body);
    const cart = await this.cartService.applyCoupon({ ...this.getOwner(request), code: input.code });
    response.status(200).json({
      message: 'Cupón aplicado al carrito.',
      data: cart,
    });
  };

  // Quita el cupón aplicado, pero conserva los productos del carrito.
  removeCoupon = async (request: Request, response: Response): Promise<void> => {
    const cart = await this.cartService.removeCoupon(this.getOwner(request));
    response.status(200).json({
      message: 'Cupón quitado del carrito.',
      data: cart,
    });
  };

  // Vacía todos los productos y elimina el cupón asociado al carrito.
  clear = async (request: Request, response: Response): Promise<void> => {
    const cart = await this.cartService.clearCart(this.getOwner(request));
    response.status(200).json({
      message: 'El carrito quedó vacío.',
      data: cart,
    });
  };

  // Obtiene la identidad del propietario para trabajar con clientes o invitados.
  private getOwner(request: Request): { userId?: number; guestToken?: string } {
    // Un usuario autenticado tiene prioridad; el token permite mantener carritos de invitados.
    const headerToken = request.header('x-guest-cart-token')?.trim();
    const guestToken = headerToken ? guestCartTokenSchema.parse(headerToken) : undefined;
    const userId = request.auth?.userId;
    return {
      ...(userId ? { userId } : {}),
      ...(guestToken ? { guestToken } : {}),
    };
  }
}
