import { z } from 'zod';

export const returnOrderParamsSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

export const createReturnSchema = z.object({
  reason: z.string().trim().min(3).max(300),
  items: z.array(z.object({
    orderDetailId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    amount: z.number().nonnegative(),
  })).min(1),
});

export const returnIdParamsSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  returnId: z.coerce.number().int().positive(),
});

export const resolveReturnSchema = z.object({
  decision: z.enum(['APROBAR', 'RECHAZAR']),
});
