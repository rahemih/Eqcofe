import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor, TransactionManager } from '../../../platform/database/transaction-manager';
import {
  CustomerMetric,
  InventorySnapshotMetric,
  ProfitDailyMetric,
  SalesDailyMetric,
  WholesaleApplicationMetric,
  OperationalMetric,
} from '../domain/analytics-read-model';

@Injectable()
export class AnalyticsProjectionRepository {
  constructor(private readonly tx: TransactionManager) {}

  db() { return this.tx.readonly(); }

  async upsertOperational(ex:DatabaseExecutor,kind:'fulfillment'|'shipment'|'return'|'warranty',m:OperationalMetric){
    const t=m.timestamps;
    if(kind==='fulfillment')return sql`INSERT INTO analytics.fulfillment_operational_metrics(order_id,status,created_at,preparation_started_at,completed_at,cancelled_at,source_version,source_watermark,projected_at)
      VALUES(${m.id}::uuid,${m.status},${m.startedAt},${t.preparation_started_at},${t.completed_at},${t.cancelled_at},${m.sourceVersion},${m.sourceWatermark},now()) ON CONFLICT(order_id) DO UPDATE SET status=EXCLUDED.status,created_at=EXCLUDED.created_at,preparation_started_at=EXCLUDED.preparation_started_at,completed_at=EXCLUDED.completed_at,cancelled_at=EXCLUDED.cancelled_at,source_version=EXCLUDED.source_version,source_watermark=EXCLUDED.source_watermark,projected_at=now() WHERE analytics.fulfillment_operational_metrics.source_watermark<=EXCLUDED.source_watermark AND analytics.fulfillment_operational_metrics.source_version<=EXCLUDED.source_version`.execute(ex);
    if(kind==='shipment')return sql`INSERT INTO analytics.shipment_operational_metrics(shipment_id,order_id,warehouse_id,carrier_provider_id,status,created_at,ready_at,handed_over_at,delivered_at,cancelled_at,last_tracking_at,source_version,source_watermark,projected_at)
      VALUES(${m.id}::uuid,${m.orderId}::uuid,${m.warehouseId}::uuid,${m.carrierProviderId??null}::uuid,${m.status},${m.startedAt},${t.ready_at},${t.handed_over_at},${t.delivered_at},${t.cancelled_at},${t.last_tracking_at},${m.sourceVersion},${m.sourceWatermark},now()) ON CONFLICT(shipment_id) DO UPDATE SET status=EXCLUDED.status,ready_at=EXCLUDED.ready_at,handed_over_at=EXCLUDED.handed_over_at,delivered_at=EXCLUDED.delivered_at,cancelled_at=EXCLUDED.cancelled_at,last_tracking_at=EXCLUDED.last_tracking_at,source_version=EXCLUDED.source_version,source_watermark=EXCLUDED.source_watermark,projected_at=now() WHERE analytics.shipment_operational_metrics.source_watermark<=EXCLUDED.source_watermark AND analytics.shipment_operational_metrics.source_version<=EXCLUDED.source_version`.execute(ex);
    if(kind==='return')return sql`INSERT INTO analytics.return_operational_metrics(return_id,order_id,customer_id,status,requested_at,reviewed_at,approved_at,rejected_at,received_at,inspection_started_at,resolved_at,cancelled_at,source_version,source_watermark,projected_at)
      VALUES(${m.id}::uuid,${m.orderId}::uuid,${m.customerId}::uuid,${m.status},${m.startedAt},${t.reviewed_at},${t.approved_at},${t.rejected_at},${t.received_at},${t.inspection_started_at},${t.resolved_at},${t.cancelled_at},${m.sourceVersion},${m.sourceWatermark},now()) ON CONFLICT(return_id) DO UPDATE SET status=EXCLUDED.status,reviewed_at=EXCLUDED.reviewed_at,approved_at=EXCLUDED.approved_at,rejected_at=EXCLUDED.rejected_at,received_at=EXCLUDED.received_at,inspection_started_at=EXCLUDED.inspection_started_at,resolved_at=EXCLUDED.resolved_at,cancelled_at=EXCLUDED.cancelled_at,source_version=EXCLUDED.source_version,source_watermark=EXCLUDED.source_watermark,projected_at=now() WHERE analytics.return_operational_metrics.source_watermark<=EXCLUDED.source_watermark AND analytics.return_operational_metrics.source_version<=EXCLUDED.source_version`.execute(ex);
    return sql`INSERT INTO analytics.warranty_operational_metrics(claim_id,order_id,customer_id,status,requested_at,reviewed_at,approved_at,rejected_at,received_at,repair_started_at,resolved_at,closed_at,cancelled_at,source_version,source_watermark,projected_at)
      VALUES(${m.id}::uuid,${m.orderId}::uuid,${m.customerId}::uuid,${m.status},${m.startedAt},${t.reviewed_at},${t.approved_at},${t.rejected_at},${t.received_at},${t.repair_started_at},${t.resolved_at},${t.closed_at},${t.cancelled_at},${m.sourceVersion},${m.sourceWatermark},now()) ON CONFLICT(claim_id) DO UPDATE SET status=EXCLUDED.status,reviewed_at=EXCLUDED.reviewed_at,approved_at=EXCLUDED.approved_at,rejected_at=EXCLUDED.rejected_at,received_at=EXCLUDED.received_at,repair_started_at=EXCLUDED.repair_started_at,resolved_at=EXCLUDED.resolved_at,closed_at=EXCLUDED.closed_at,cancelled_at=EXCLUDED.cancelled_at,source_version=EXCLUDED.source_version,source_watermark=EXCLUDED.source_watermark,projected_at=now() WHERE analytics.warranty_operational_metrics.source_watermark<=EXCLUDED.source_watermark AND analytics.warranty_operational_metrics.source_version<=EXCLUDED.source_version`.execute(ex);
  }

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

  async operationalMetrics(kind:'fulfillment'|'shipment'|'return'|'warranty',from:Date,to:Date,limit:number){
    if(kind==='fulfillment')return(await sql<any>`SELECT *,order_id id,created_at started_at,completed_at completed_at FROM analytics.fulfillment_operational_metrics WHERE created_at BETWEEN ${from} AND ${to} ORDER BY source_watermark DESC,order_id LIMIT ${limit}`.execute(this.db())).rows;
    if(kind==='shipment')return(await sql<any>`SELECT *,shipment_id id,created_at started_at,delivered_at completed_at FROM analytics.shipment_operational_metrics WHERE created_at BETWEEN ${from} AND ${to} ORDER BY source_watermark DESC,shipment_id LIMIT ${limit}`.execute(this.db())).rows;
    if(kind==='return')return(await sql<any>`SELECT *,return_id id,requested_at started_at,resolved_at completed_at FROM analytics.return_operational_metrics WHERE requested_at BETWEEN ${from} AND ${to} ORDER BY source_watermark DESC,return_id LIMIT ${limit}`.execute(this.db())).rows;
    return(await sql<any>`SELECT *,claim_id id,requested_at started_at,closed_at completed_at FROM analytics.warranty_operational_metrics WHERE requested_at BETWEEN ${from} AND ${to} ORDER BY source_watermark DESC,claim_id LIMIT ${limit}`.execute(this.db())).rows;
  }
}
