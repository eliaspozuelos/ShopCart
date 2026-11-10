import { ReportsRepository } from './reports.repository.js';
import type { DashboardSnapshot } from './reports.types.js';
import { buildDashboardWorkbook, reportFileName } from './reports.workbook.js';

const REPORT_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  expiresAt: number;
  snapshot: DashboardSnapshot;
}

const cache = new Map<string, CacheEntry>();

export function invalidateReportCache(): void {
  cache.clear();
}

export class ReportsService {
  constructor(private readonly repository = new ReportsRepository()) {}

  async dashboard(from?: Date, to?: Date): Promise<DashboardSnapshot> {
    const key = cacheKey(from, to);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

    const snapshot = await this.repository.dashboard(from, to);
    cache.set(key, { expiresAt: Date.now() + REPORT_CACHE_TTL_MS, snapshot });
    return snapshot;
  }

  async exportDashboard(from?: Date, to?: Date): Promise<{ filename: string; body: Buffer }> {
    const snapshot = await this.dashboard(from, to);
    return {
      filename: reportFileName(from, to),
      body: await buildDashboardWorkbook(snapshot, from, to),
    };
  }
}

function cacheKey(from?: Date, to?: Date): string {
  return `${from?.getTime() ?? ''}|${to?.getTime() ?? ''}`;
}
