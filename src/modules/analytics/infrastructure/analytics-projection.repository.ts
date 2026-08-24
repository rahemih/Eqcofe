import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor, TransactionManager } from '../../../platform/database/transaction-manager';
import {
  CustomerMetric,
  InventorySnapshotMetric,
  ProfitDailyMetric,
  SalesDailyMetric,
  WholesaleApplicationMetric,
} from '../domain/analytics-read-model';

@Injectable()
export class AnalyticsProjectionRepository {
  constructor(private readonly tx: TransactionManager) {}

  db() { return this.tx.readonly(); }

  async upsertSalesDaily(ex: DatabaseExecutor, metric: SalesDailyMetric) {
    await sql`INSERT INTO analytics.sales_daily(
      business_date,order_count,gross_sales_toman,paid_sales_toman,cancelled_count,source_watermark,projected_at)
      VALUES(${metric.businessDate}::date,${metric.orderCount},${metric.grossSalesToman},${metric.paidSalesToman},${metric.cancelledCount},${metric.sourceWatermark},now())
      ON CONFLICT (business_date) DO UPDATE SET
        order_count=EXCLUDED.order_count,
        gross_sales_toman=EXCLUDED.gross_sales_toman,
        paid_sales_toman=EXCLUDED.paid_sales_toman,
        cancelled_count=EXCLUDED.cancelled_count,
        source_watermark=EXCLUDED.source_watermark,
        projected_at=now()
      WHERE analytics.sales_daily.source_watermark <= EXCLUDED.source_watermark`.execute(ex);
  }

  async upsertInventorySnapshot(ex: DatabaseExecutor, metric: InventorySnapshotMetric) {
    await sql`INSERT INTO analytics.inventory_snapshot(
      variant_id,available_quantity,reserved_quantity,stock_state,source_watermark,captured_at,projected_at)
      VALUES(${metric.variantId}::uuid,${metric.availableQuantity},${metric.reservedQuantity},${metric.stockState},${metric.sourceWatermark},${metric.capturedAt},now())
      ON CONFLICT (variant_id) DO UPDATE SET
        available_quantity=EXCLUDED.available_quantity,
        reserved_quantity=EXCLUDED.reserved_quantity,
        stock_state=EXCLUDED.stock_state,
        source_watermark=EXCLUDED.source_watermark,
        captured_at=EXCLUDED.captured_at,
        projected_at=now()
      WHERE analytics.inventory_snapshot.source_watermark <= EXCLUDED.source_watermark`.execute(ex);
  }

  async upsertCustomerMetric(ex: DatabaseExecutor, metric: CustomerMetric) {
    await sql`INSERT INTO analytics.customer_metrics(
      customer_id,order_count,lifetime_value_toman,last_order_at,source_watermark,projected_at)
      VALUES(${metric.customerId}::uuid,${metric.orderCount},${metric.lifetimeValueToman},${metric.lastOrderAt},${metric.sourceWatermark},now())
      ON CONFLICT (customer_id) DO UPDATE SET
        order_count=EXCLUDED.order_count,
        lifetime_value_toman=EXCLUDED.lifetime_value_toman,
        last_order_at=EXCLUDED.last_order_at,
        source_watermark=EXCLUDED.source_watermark,
        projected_at=now()
      WHERE analytics.customer_metrics.source_watermark <= EXCLUDED.source_watermark`.execute(ex);
  }

  async upsertProfitDaily(ex: DatabaseExecutor, metric: ProfitDailyMetric) {
    await sql`INSERT INTO analytics.profit_daily(
      business_date,revenue_toman,cogs_toman,operating_cost_toman,profit_toman,source_watermark,projected_at)
      VALUES(${metric.businessDate}::date,${metric.revenueToman},${metric.cogsToman},${metric.operatingCostToman},${metric.profitToman},${metric.sourceWatermark},now())
      ON CONFLICT (business_date) DO UPDATE SET
        revenue_toman=EXCLUDED.revenue_toman,
        cogs_toman=EXCLUDED.cogs_toman,
        operating_cost_toman=EXCLUDED.operating_cost_toman,
        profit_toman=EXCLUDED.profit_toman,
        source_watermark=EXCLUDED.source_watermark,
        projected_at=now()
      WHERE analytics.profit_daily.source_watermark <= EXCLUDED.source_watermark`.execute(ex);
  }

  async upsertWholesaleApplication(ex: DatabaseExecutor, metric: WholesaleApplicationMetric) {
    await sql`INSERT INTO analytics.wholesale_application_metrics(
      application_id,customer_id,status,submitted_at,review_started_at,reviewed_at,source_watermark,projected_at)
      VALUES(${metric.applicationId}::uuid,${metric.customerId}::uuid,${metric.status},${metric.submittedAt},${metric.reviewStartedAt},${metric.reviewedAt},${metric.sourceWatermark},now())
      ON CONFLICT (application_id) DO UPDATE SET
        customer_id=EXCLUDED.customer_id,
        status=EXCLUDED.status,
        submitted_at=EXCLUDED.submitted_at,
        review_started_at=EXCLUDED.review_started_at,
        reviewed_at=EXCLUDED.reviewed_at,
        source_watermark=EXCLUDED.source_watermark,
        projected_at=now()
      WHERE analytics.wholesale_application_metrics.source_watermark <= EXCLUDED.source_watermark`.execute(ex);
  }

  async advanceCheckpoint(ex: DatabaseExecutor, projectionKey: string, sourceCursor: string) {
    await sql`INSERT INTO analytics.projection_checkpoints(projection_key,source_cursor,projected_at)
      VALUES(${projectionKey},${sourceCursor},now())
      ON CONFLICT (projection_key) DO UPDATE SET source_cursor=EXCLUDED.source_cursor,projected_at=now()`.execute(ex);
  }

  async salesDaily(from: string, to: string) {
    return (await sql<any>`SELECT * FROM analytics.sales_daily WHERE business_date BETWEEN ${from}::date AND ${to}::date ORDER BY business_date`.execute(this.db())).rows;
  }

  async inventorySnapshot(limit = 500) {
    return (await sql<any>`SELECT * FROM analytics.inventory_snapshot ORDER BY captured_at DESC,variant_id LIMIT ${limit}`.execute(this.db())).rows;
  }

  async customerMetrics(limit = 500) {
    return (await sql<any>`SELECT * FROM analytics.customer_metrics ORDER BY lifetime_value_toman DESC,customer_id LIMIT ${limit}`.execute(this.db())).rows;
  }

  async profitDaily(from: string, to: string) {
    return (await sql<any>`SELECT * FROM analytics.profit_daily WHERE business_date BETWEEN ${from}::date AND ${to}::date ORDER BY business_date`.execute(this.db())).rows;
  }

  async wholesaleApplicationMetrics(limit = 500) {
    return (await sql<any>`SELECT * FROM analytics.wholesale_application_metrics ORDER BY submitted_at DESC,application_id LIMIT ${limit}`.execute(this.db())).rows;
  }
}
