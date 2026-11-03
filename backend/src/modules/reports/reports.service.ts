import { ReportsRepository } from './reports.repository.js';

export class ReportsService {
  constructor(private readonly repository = new ReportsRepository()) {}

  dashboard(from?: Date, to?: Date) {
    return this.repository.dashboard(from, to);
  }
}
