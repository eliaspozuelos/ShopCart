import { z } from 'zod';

export const checkoutSchema = z.object({
  addressId: z.number().int().positive(),
  paymentMethod: z.enum(['TARJETA', 'CONTRA_ENTREGA']),
  idempotencyKey: z.string().uuid().optional(),
});
