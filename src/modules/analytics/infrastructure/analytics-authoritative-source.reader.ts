import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { CustomerMetric, InventorySnapshotMetric, ProfitDailyMetric, SalesDailyMetric } from '../domain/analytics-read-model';

function safeInteger(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n)) throw new Error('ANALYTICS_SOURCE_INTEGER_OUT_OF_RANGE');
  return n;
}

@Injectable()
export class AnalyticsAuthoritativeSourceReader {
  async orderContext(ex: DatabaseExecutor, orderId: string) {
    const r = await sql<any>`SELECT id,customer_id,created_at FROM orders.orders WHERE id=${orderId}::uuid`.execute(ex);
    const row = r.rows[0];
    if (!row) return null;
    return { orderId: String(row.id), customerId: row.customer_id ? String(row.customer_id) : null, businessDate: new Date(row.created_at).toISOString().slice(0, 10) };
  }

  async salesDaily(ex: DatabaseExecutor, businessDate: string, watermark: Date): Promise<SalesDailyMetric> {
    const r = await sql<any>`SELECT
      count(*)::bigint AS order_count,
      COALESCE(sum(CASE WHEN o.status NOT IN ('cancelled','expired') THEN o.total_toman ELSE 0 END),0)::bigint AS gross_sales_toman,
      COALESCE(sum(CASE WHEN p.status IN ('paid','late_received','refund_required','refunded') THEN p.amount_toman-COALESCE(ref.succeeded_toman,0) ELSE 0 END),0)::bigint AS paid_sales_toman,
      count(*) FILTER (WHERE o.status IN ('cancelled','expired'))::bigint AS cancelled_count
      FROM orders.orders o
      LEFT JOIN payments.payments p ON p.id=o.payment_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(rf.amount_toman),0)::bigint AS succeeded_toman
        FROM payments.refunds rf WHERE rf.payment_id=p.id AND rf.status='succeeded'
      ) ref ON true
      WHERE o.created_at>=${businessDate}::date AND o.created_at<(${businessDate}::date + interval '1 day')`.execute(ex);
    const row = r.rows[0] ?? {};
    return {
      businessDate,
      orderCount: safeInteger(row.order_count),
      grossSalesToman: safeInteger(row.gross_sales_toman),
      paidSalesToman: safeInteger(row.paid_sales_toman),
      cancelledCount: safeInteger(row.cancelled_count),
      sourceWatermark: watermark,
    };
  }

  async inventorySnapshot(ex: DatabaseExecutor, variantId: string, watermark: Date): Promise<InventorySnapshotMetric> {
    const r = await sql<any>`SELECT
      COALESCE(sum(sb.on_hand-sb.reserved-sb.allocated-sb.damaged-sb.quarantine),0)::bigint AS available_quantity,
      COALESCE(sum(sb.reserved),0)::bigint AS reserved_quantity
      FROM inventory.stock_balances sb
      JOIN inventory.warehouses w ON w.id=sb.warehouse_id
      WHERE sb.variant_id=${variantId}::uuid AND w.is_active=true`.execute(ex);
    const available = safeInteger(r.rows[0]?.available_quantity);
    const reserved = safeInteger(r.rows[0]?.reserved_quantity);
    return {
      variantId,
      availableQuantity: available,
      reservedQuantity: reserved,
      stockState: available === 0 ? 'out_of_stock' : 'in_stock',
      sourceWatermark: watermark,
      capturedAt: watermark,
    };
  }

  async customerMetric(ex: DatabaseExecutor, customerId: string, watermark: Date): Promise<CustomerMetric> {
    const r = await sql<any>`SELECT
      count(*) FILTER (WHERE o.status NOT IN ('cancelled','expired'))::bigint AS order_count,
      COALESCE(sum(CASE WHEN p.status IN ('paid','late_received','refund_required','refunded') THEN p.amount_toman-COALESCE(ref.succeeded_toman,0) ELSE 0 END),0)::bigint AS lifetime_value_toman,
      max(o.created_at) FILTER (WHERE o.status NOT IN ('cancelled','expired')) AS last_order_at
      FROM orders.orders o
      LEFT JOIN payments.payments p ON p.id=o.payment_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(rf.amount_toman),0)::bigint AS succeeded_toman
        FROM payments.refunds rf WHERE rf.payment_id=p.id AND rf.status='succeeded'
      ) ref ON true
      WHERE o.customer_id=${customerId}::uuid`.execute(ex);
    const row = r.rows[0] ?? {};
    return {
      customerId,
      orderCount: safeInteger(row.order_count),
      lifetimeValueToman: safeInteger(row.lifetime_value_toman),
      lastOrderAt: row.last_order_at ? new Date(row.last_order_at) : null,
      sourceWatermark: watermark,
    };
  }

  async profitDaily(ex: DatabaseExecutor, businessDate: string, watermark: Date): Promise<ProfitDailyMetric> {
    const r = await sql<any>`WITH ranked AS (
      SELECT DISTINCT ON (pc.order_id)
        pc.order_id,pc.net_sales_toman,pc.cogs_toman,pc.online_costs_toman,pc.shipping_margin_toman,pc.profit_before_distribution_toman
      FROM finance.profit_calculations pc
      JOIN orders.orders o ON o.id=pc.order_id
      WHERE pc.is_current=true
        AND o.created_at>=${businessDate}::date AND o.created_at<(${businessDate}::date + interval '1 day')
      ORDER BY pc.order_id,
        CASE pc.calculation_stage WHEN 'final' THEN 3 WHEN 'provisional' THEN 2 ELSE 1 END DESC,
        pc.calculated_at DESC,pc.id DESC
    ) SELECT
      COALESCE(sum(net_sales_toman+shipping_margin_toman),0)::bigint AS revenue_toman,
      COALESCE(sum(cogs_toman),0)::bigint AS cogs_toman,
      COALESCE(sum(online_costs_toman),0)::bigint AS operating_cost_toman,
      COALESCE(sum(profit_before_distribution_toman),0)::bigint AS profit_toman
      FROM ranked`.execute(ex);
    const row = r.rows[0] ?? {};
    return {
      businessDate,
      revenueToman: safeInteger(row.revenue_toman),
      cogsToman: safeInteger(row.cogs_toman),
      operatingCostToman: safeInteger(row.operating_cost_toman),
      profitToman: safeInteger(row.profit_toman),
      sourceWatermark: watermark,
    };
  }
}
