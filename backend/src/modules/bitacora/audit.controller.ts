import type { Request, Response } from 'express';
import { auditQuerySchema } from './audit.schemas.js';
import { AuditRepository } from './audit.repository.js';

export class AuditController {
  constructor(private readonly repository = new AuditRepository()) {}
  list = async (request: Request, response: Response): Promise<void> => {
    const input = auditQuerySchema.parse(request.query);
    const result = await this.repository.list(input);
    response.json({ data: result.entries, pagination: { ...input, total: result.total, totalPages: Math.ceil(result.total / input.pageSize) || 1 } });
  };
}
