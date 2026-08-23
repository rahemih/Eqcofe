import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import {
  CustomerMetric,
  InventorySnapshotMetric,
  ProfitDailyMetric,
  SalesDailyMetric,
} from '../domain/analytics-read-model';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

@Injectable()
export class AnalyticsProjectionService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repository: AnalyticsProjectionRepository,
  ) {}

  projectSalesDaily(metric: SalesDailyMetric, sourceCursor: string) {
    return this.tx.run(async (trx) => {
      await this.repository.upsertSalesDaily(trx, metric);
      await this.repository.advanceCheckpoint(trx, 'sales_daily', sourceCursor);
    });
  }

  projectInventorySnapshot(metric: InventorySnapshotMetric, sourceCursor: string) {
    return this.tx.run(async (trx) => {
      await this.repository.upsertInventorySnapshot(trx, metric);
      await this.repository.advanceCheckpoint(trx, 'inventory_snapshot', sourceCursor);
    });
  }

  projectCustomerMetric(metric: CustomerMetric, sourceCursor: string) {
    return this.tx.run(async (trx) => {
      await this.repository.upsertCustomerMetric(trx, metric);
      await this.repository.advanceCheckpoint(trx, 'customer_metrics', sourceCursor);
    });
  }

  projectProfitDaily(metric: ProfitDailyMetric, sourceCursor: string) {
    return this.tx.run(async (trx) => {
      await this.repository.upsertProfitDaily(trx, metric);
      await this.repository.advanceCheckpoint(trx, 'profit_daily', sourceCursor);
    });
  }
}
