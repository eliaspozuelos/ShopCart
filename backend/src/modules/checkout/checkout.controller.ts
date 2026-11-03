import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import { checkoutSchema } from './checkout.schemas.js';
import { CheckoutService } from './checkout.service.js';

export class CheckoutController {
  constructor(private readonly service = new CheckoutService()) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const userId = request.auth?.userId;
    if (!userId) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    const input = checkoutSchema.parse(request.body);
    const data = await this.service.checkout({
      userId,
      addressId: input.addressId,
      paymentMethod: input.paymentMethod,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });
    console.info('Checkout completado correctamente.', {
      userId,
      orderId: data.order.IDPedido,
      paymentMethod: input.paymentMethod,
      total: data.order.Total,
    });
    response.status(201).json({
      message: input.paymentMethod === 'TARJETA'
        ? 'Pedido creado; el pago con tarjeta fue registrado en modo local de prueba.'
        : 'Pedido creado con pago contra entrega.',
      data,
    });
  };
}
