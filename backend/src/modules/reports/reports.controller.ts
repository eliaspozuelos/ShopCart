import type { Request, Response } from 'express';
import { reportQuerySchema } from './reports.schemas.js';
import { ReportsService } from './reports.service.js';

export class ReportsController {
  constructor(private readonly service = new ReportsService()) {}

  dashboard = async (request: Request, response: Response): Promise<void> => {
    const input = reportQuerySchema.parse(request.query);
    response.json({ data: await this.service.dashboard(input.from, input.to) });
  };

  exportExcel = async (request: Request, response: Response): Promise<void> => {
    const input = reportQuerySchema.parse(request.query);
    const file = await this.service.exportDashboard(input.from, input.to);
    response
      .status(200)
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', `attachment; filename="${file.filename}"`)
      .send(file.body);
  };
}
