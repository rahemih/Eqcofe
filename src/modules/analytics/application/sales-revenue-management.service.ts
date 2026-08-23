import { Injectable } from '@nestjs/common';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

export interface SalesRevenueDailyPoint {
  businessDate: string;
  orderCount: number;
  cancelledCount: number;
  grossSalesToman: number;
  paidSalesToman: number;
  sourceWatermark: Date;
}

export interface SalesRevenueManagementReadModel {
  from: string;
  to: string;
  dayCount: number;
  orderCount: number;
  cancelledCount: number;
  grossSalesToman: number;
  paidSalesToman: number;
  collectionRateBps: number;
  cancellationRateBps: number;
  averageGrossOrderToman: number;
  sourceWatermark: Date | null;
  daily: SalesRevenueDailyPoint[];
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

function parseBusinessDate(value: unknown, field: 'from' | 'to'): Date {
  const text = String(value ?? '').trim();
  if (!DATE_ONLY.test(text)) throw new Error(`ANALYTICS_${field.toUpperCase()}_DATE_INVALID`);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`ANALYTICS_${field.toUpperCase()}_DATE_INVALID`);
  }
  return date;
}

function safeInteger(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n)) throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
  return n;
}

function safeAdd(total: number, value: number): number {
  const next = total + value;
  if (!Number.isSafeInteger(next)) throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
  return next;
}

function basisPoints(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator * 10_000) / denominator);
}

@Injectable()
export class SalesRevenueManagementService {
  constructor(private readonly repository: AnalyticsProjectionRepository) {}

  async read(fromInput: unknown, toInput: unknown): Promise<SalesRevenueManagementReadModel> {
    const fromDate = parseBusinessDate(fromInput, 'from');
    const toDate = parseBusinessDate(toInput, 'to');
    if (fromDate.getTime() > toDate.getTime()) throw new Error('ANALYTICS_DATE_RANGE_INVALID');

    const dayCount = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
    if (dayCount > MAX_RANGE_DAYS) throw new Error('ANALYTICS_DATE_RANGE_TOO_LARGE');

    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    const rows = await this.repository.salesDaily(from, to);

    const daily: SalesRevenueDailyPoint[] = rows.map((row: any) => ({
      businessDate: String(row.business_date),
      orderCount: safeInteger(row.order_count),
      cancelledCount: safeInteger(row.cancelled_count),
      grossSalesToman: safeInteger(row.gross_sales_toman),
      paidSalesToman: safeInteger(row.paid_sales_toman),
      sourceWatermark: new Date(row.source_watermark),
    }));

    let orderCount = 0;
    let cancelledCount = 0;
    let grossSalesToman = 0;
    let paidSalesToman = 0;
    let sourceWatermark: Date | null = null;

    for (const row of daily) {
      if (Number.isNaN(row.sourceWatermark.getTime())) throw new Error('ANALYTICS_SOURCE_WATERMARK_INVALID');
      orderCount = safeAdd(orderCount, row.orderCount);
      cancelledCount = safeAdd(cancelledCount, row.cancelledCount);
      grossSalesToman = safeAdd(grossSalesToman, row.grossSalesToman);
      paidSalesToman = safeAdd(paidSalesToman, row.paidSalesToman);
      if (!sourceWatermark || row.sourceWatermark > sourceWatermark) sourceWatermark = row.sourceWatermark;
    }

    return {
      from,
      to,
      dayCount,
      orderCount,
      cancelledCount,
      grossSalesToman,
      paidSalesToman,
      collectionRateBps: basisPoints(paidSalesToman, grossSalesToman),
      cancellationRateBps: basisPoints(cancelledCount, orderCount),
      averageGrossOrderToman: orderCount > 0 ? Math.round(grossSalesToman / orderCount) : 0,
      sourceWatermark,
      daily,
    };
  }
}
