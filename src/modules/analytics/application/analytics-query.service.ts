import { Injectable } from '@nestjs/common';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

@Injectable()
export class AnalyticsQueryService {
  constructor(private readonly repository: AnalyticsProjectionRepository) {}

  salesDaily(from: string, to: string) {
    return this.repository.salesDaily(from, to);
  }

  inventorySnapshot(limit?: number) {
    return this.repository.inventorySnapshot(limit);
  }

  customerMetrics(limit?: number) {
    return this.repository.customerMetrics(limit);
  }

  profitDaily(from: string, to: string) {
    return this.repository.profitDaily(from, to);
  }
}
