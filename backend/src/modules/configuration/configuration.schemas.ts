import { z } from 'zod';

const keySchema = z.string().trim().min(1).max(50);
const valueSchema = z.string().trim().min(1).max(100);

export const configurationKeyParamsSchema = z.object({
  key: keySchema,
});

export const createConfigurationSchema = z.object({
  key: keySchema,
  value: valueSchema,
  description: z.string().trim().max(200).nullable().optional(),
});

export const updateConfigurationSchema = z.object({
  value: valueSchema,
  description: z.string().trim().max(200).nullable().optional(),
});
