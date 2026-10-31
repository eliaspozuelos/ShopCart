import { z } from 'zod';

export const categoryIdParamsSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

export const productIdParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productImageParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});

export const productVariantParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive(),
});

export const catalogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
}).refine((input) => input.name !== undefined || input.active !== undefined, {
  message: 'Debes indicar el nombre o el estado de la categoría.',
});

export const createAttributeSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

const variantAttributeSchema = z.object({
  attributeId: z.number().int().positive(),
  value: z.string().trim().min(1).max(100),
});

export const saveVariantSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  price: z.number().positive().max(999999999999.99),
  stock: z.number().int().min(0).max(2147483647).optional(),
  attributes: z.array(variantAttributeSchema).max(20).default([]),
});

export const saveProductImageSchema = z.object({
  url: z.string().trim().url().max(500),
  order: z.number().int().min(0).max(2147483647).default(0),
});

export const createProductSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  variants: z.array(saveVariantSchema).max(100).default([]),
  images: z.array(saveProductImageSchema).max(20).default([]),
});

export const updateProductSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
}).refine((input) =>
  input.categoryId !== undefined
  || input.name !== undefined
  || input.description !== undefined
  || input.active !== undefined, {
  message: 'Debes indicar al menos un campo del producto.',
});

export const variantStatusSchema = z.object({
  active: z.boolean(),
});
