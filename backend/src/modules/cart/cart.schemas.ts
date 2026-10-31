import { z } from 'zod';

export const guestCartTokenSchema = z.string().uuid().optional();

export const addCartItemSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().positive().max(999),
});

export const cartItemParamsSchema = z.object({
  itemId: z.coerce.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(999),
});

export const applyCartCouponSchema = z.object({
  code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
});
