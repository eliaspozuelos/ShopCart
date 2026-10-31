import { z } from 'zod';

export const auditQuerySchema = z.object({
  module: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
