import { z } from 'zod';

export const couponIdParamsSchema = z.object({
  couponId: z.coerce.number().int().positive(),
});

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(50).optional(),
  active: z.stringbool().optional(),
  valid: z.stringbool().optional(),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(30).transform((val) => val.toUpperCase()),
  type: z.enum(['PORCENTAJE', 'MONTO']),
  value: z.number().positive().max(999999999999.99),
  minimumAmount: z.number().min(0).max(999999999999.99).default(0),
  validFrom: z.string().datetime({ message: 'validFrom debe ser una fecha ISO válida (ej: 2026-11-01T00:00:00Z)' }),
  validUntil: z.string().datetime({ message: 'validUntil debe ser una fecha ISO válida (ej: 2026-12-31T23:59:59Z)' }),
  totalUsageLimit: z.number().int().positive().max(2147483647),
  usageLimitPerCustomer: z.number().int().positive().max(2147483647).default(1),
  categoryId: z.number().int().positive().nullable().optional(),
}).refine((data) => new Date(data.validUntil) > new Date(data.validFrom), {
  path: ['validUntil'],
  message: 'La fecha de fin de vigencia debe ser posterior a la fecha de inicio.',
}).refine((data) => data.type !== 'PORCENTAJE' || data.value <= 100, {
  path: ['value'],
  message: 'Para cupones de porcentaje, el valor no puede superar el 100%.',
});

export const updateCouponSchema = z.object({
  minimumAmount: z.number().min(0).max(999999999999.99).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  totalUsageLimit: z.number().int().positive().max(2147483647).optional(),
  usageLimitPerCustomer: z.number().int().positive().max(2147483647).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
}).refine((data) => {
  if (data.validFrom && data.validUntil) {
    return new Date(data.validUntil) > new Date(data.validFrom);
  }
  return true;
}, {
  path: ['validUntil'],
  message: 'La fecha de fin de vigencia debe ser posterior a la fecha de inicio.',
}).refine((data) => Object.values(data).some((val) => val !== undefined), {
  message: 'Debes indicar al menos un campo para actualizar.',
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(30).transform((val) => val.toUpperCase()),
  subtotal: z.number().min(0).max(999999999999.99),
  eligibleSubtotal: z.number().min(0).max(999999999999.99).optional(),
});
