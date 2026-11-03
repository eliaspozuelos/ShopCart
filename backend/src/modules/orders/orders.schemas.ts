import { z } from 'zod';

export const orderIdParamsSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().max(30).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const changeOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMADO', 'PREPARANDO', 'DESPACHADO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO']),
});
