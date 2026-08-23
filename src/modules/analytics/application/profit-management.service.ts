import { Injectable } from '@nestjs/common';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

export interface ProfitManagementDailyPoint {
  businessDate: string;
  revenueToman: number;
  cogsToman: number;
  operatingCostToman: number;
  profitToman: number;
  grossProfitToman: number;
  grossMarginBps: number;
  netMarginBps: number;
  sourceWatermark: Date;
}

export interface ProfitManagementReadModel {
  from: string;
  to: string;
  dayCount: number;
  revenueToman: number;
  cogsToman: number;
  operatingCostToman: number;
  grossProfitToman: number;
  profitToman: number;
  grossMarginBps: number;
  netMarginBps: number;
  sourceWatermark: Date | null;
  daily: ProfitManagementDailyPoint[];
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

function safeSubtract(left: number, right: number): number {
  const next = left - right;
  if (!Number.isSafeInteger(next)) throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
  return next;
}

function basisPoints(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const value = Math.round((numerator * 10_000) / denominator);
  if (!Number.isSafeInteger(value)) throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');
  return value;
}

@Injectable()
export class ProfitManagementService {
  constructor(private readonly repository: AnalyticsProjectionRepository) {}

  async read(fromInput: unknown, toInput: unknown): Promise<ProfitManagementReadModel> {
    const fromDate = parseBusinessDate(fromInput, 'from');
    const toDate = parseBusinessDate(toInput, 'to');
    if (fromDate.getTime() > toDate.getTime()) throw new Error('ANALYTICS_DATE_RANGE_INVALID');

    const dayCount = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
    if (dayCount > MAX_RANGE_DAYS) throw new Error('ANALYTICS_DATE_RANGE_TOO_LARGE');

    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    const rows = await this.repository.profitDaily(from, to);

    const daily: ProfitManagementDailyPoint[] = rows.map((row: any) => {
      const revenueToman = safeInteger(row.revenue_toman);
      const cogsToman = safeInteger(row.cogs_toman);
      const operatingCostToman = safeInteger(row.operating_cost_toman);
      const profitToman = safeInteger(row.profit_toman);
      const grossProfitToman = safeSubtract(revenueToman, cogsToman);
      const sourceWatermark = new Date(row.source_watermark);
      if (Number.isNaN(sourceWatermark.getTime())) throw new Error('ANALYTICS_SOURCE_WATERMARK_INVALID');
      return {
        businessDate: String(row.business_date),
        revenueToman,
        cogsToman,
        operatingCostToman,
        profitToman,
        grossProfitToman,
        grossMarginBps: basisPoints(grossProfitToman, revenueToman),
        netMarginBps: basisPoints(profitToman, revenueToman),
        sourceWatermark,
      };
    });

    let revenueToman = 0;
    let cogsToman = 0;
    let operatingCostToman = 0;
    let profitToman = 0;
    let sourceWatermark: Date | null = null;

    for (const row of daily) {
      revenueToman = safeAdd(revenueToman, row.revenueToman);
      cogsToman = safeAdd(cogsToman, row.cogsToman);
      operatingCostToman = safeAdd(operatingCostToman, row.operatingCostToman);
      profitToman = safeAdd(profitToman, row.profitToman);
      if (!sourceWatermark || row.sourceWatermark > sourceWatermark) sourceWatermark = row.sourceWatermark;
    }

    const grossProfitToman = safeSubtract(revenueToman, cogsToman);
    return {
      from,
      to,
      dayCount,
      revenueToman,
      cogsToman,
      operatingCostToman,
      grossProfitToman,
      profitToman,
      grossMarginBps: basisPoints(grossProfitToman, revenueToman),
      netMarginBps: basisPoints(profitToman, revenueToman),
      sourceWatermark,
      daily,
    };
  }
}
