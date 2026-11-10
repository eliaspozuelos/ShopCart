import { z } from 'zod';

export const inventoryVariantParamsSchema = z.object({
  variantId: z.coerce.number().int().positive(),
});

export const adjustInventorySchema = z.object({
  stock: z.number().int().min(0).max(2147483647),
  reason: z.string().trim().min(3).max(300),
});

export const movementTypes = ['ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION'] as const;

export const inventoryMovementsQuerySchema = z.object({
  variantId: z.coerce.number().int().positive().optional(),
  type: z.enum(movementTypes).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
