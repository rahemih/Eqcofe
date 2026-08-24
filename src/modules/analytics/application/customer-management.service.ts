import { Injectable } from '@nestjs/common';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

export interface CustomerManagementRow {
  customerId: string;
  orderCount: number;
  lifetimeValueToman: number;
  lastOrderAt: Date | null;
  sourceWatermark: Date;
}

export interface CustomerManagementReadModel {
  customerCount: number;
  activeCustomerCount: number;
  totalOrderCount: number;
  lifetimeValueToman: number;
  averageLifetimeValueToman: number;
  sourceWatermark: Date | null;
  rows: CustomerManagementRow[];
}

const MAX_LIMIT = 500;

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return MAX_LIMIT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) throw new Error('ANALYTICS_LIMIT_INVALID');
  return n;
}

function safeInteger(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
  return n;
}

function safeAdd(total: number, value: number): number {
  const next = total + value;
  if (!Number.isSafeInteger(next)) throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
  return next;
}

function parseDate(value: unknown, code: string): Date {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) throw new Error(code);
  return date;
}

@Injectable()
export class CustomerManagementService {
  constructor(private readonly repository: AnalyticsProjectionRepository) {}

  async read(limitInput?: unknown): Promise<CustomerManagementReadModel> {
    const limit = parseLimit(limitInput);
    const projectionRows = await this.repository.customerMetrics(limit);
    const rows: CustomerManagementRow[] = projectionRows.map((row: any) => ({
      customerId: String(row.customer_id),
      orderCount: safeInteger(row.order_count),
      lifetimeValueToman: safeInteger(row.lifetime_value_toman),
      lastOrderAt: row.last_order_at == null ? null : parseDate(row.last_order_at, 'ANALYTICS_LAST_ORDER_AT_INVALID'),
      sourceWatermark: parseDate(row.source_watermark, 'ANALYTICS_SOURCE_WATERMARK_INVALID'),
    }));

    let totalOrderCount = 0;
    let lifetimeValueToman = 0;
    let activeCustomerCount = 0;
    let sourceWatermark: Date | null = null;
    for (const row of rows) {
      totalOrderCount = safeAdd(totalOrderCount, row.orderCount);
      lifetimeValueToman = safeAdd(lifetimeValueToman, row.lifetimeValueToman);
      if (row.orderCount > 0) activeCustomerCount += 1;
      if (!sourceWatermark || row.sourceWatermark > sourceWatermark) sourceWatermark = row.sourceWatermark;
    }

    const averageLifetimeValueToman = rows.length === 0 ? 0 : Math.floor(lifetimeValueToman / rows.length);
    return { customerCount: rows.length, activeCustomerCount, totalOrderCount, lifetimeValueToman, averageLifetimeValueToman, sourceWatermark, rows };
  }
}
