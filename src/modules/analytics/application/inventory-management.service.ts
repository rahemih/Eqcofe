import { Injectable } from '@nestjs/common';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

export interface InventoryManagementRow {
  variantId: string;
  availableQuantity: number;
  reservedQuantity: number;
  stockState: 'in_stock' | 'low_stock' | 'out_of_stock';
  capturedAt: Date;
  sourceWatermark: Date;
}

export interface InventoryManagementReadModel {
  variantCount: number;
  totalAvailableQuantity: number;
  totalReservedQuantity: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  sourceWatermark: Date | null;
  rows: InventoryManagementRow[];
}

const MAX_LIMIT = 500;

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

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return MAX_LIMIT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) throw new Error('ANALYTICS_LIMIT_INVALID');
  return n;
}

function parseDate(value: unknown, code: string): Date {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) throw new Error(code);
  return date;
}

@Injectable()
export class InventoryManagementService {
  constructor(private readonly repository: AnalyticsProjectionRepository) {}

  async read(limitInput?: unknown): Promise<InventoryManagementReadModel> {
    const limit = parseLimit(limitInput);
    const projectionRows = await this.repository.inventorySnapshot(limit);

    const rows: InventoryManagementRow[] = projectionRows.map((row: any) => {
      const availableQuantity = safeInteger(row.available_quantity);
      const reservedQuantity = safeInteger(row.reserved_quantity);
      const stockState = String(row.stock_state) as InventoryManagementRow['stockState'];
      if (!['in_stock', 'low_stock', 'out_of_stock'].includes(stockState)) {
        throw new Error('ANALYTICS_STOCK_STATE_INVALID');
      }
      return {
        variantId: String(row.variant_id),
        availableQuantity,
        reservedQuantity,
        stockState,
        capturedAt: parseDate(row.captured_at, 'ANALYTICS_CAPTURED_AT_INVALID'),
        sourceWatermark: parseDate(row.source_watermark, 'ANALYTICS_SOURCE_WATERMARK_INVALID'),
      };
    });

    let totalAvailableQuantity = 0;
    let totalReservedQuantity = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let sourceWatermark: Date | null = null;

    for (const row of rows) {
      totalAvailableQuantity = safeAdd(totalAvailableQuantity, row.availableQuantity);
      totalReservedQuantity = safeAdd(totalReservedQuantity, row.reservedQuantity);
      if (row.stockState === 'in_stock') inStockCount += 1;
      if (row.stockState === 'low_stock') lowStockCount += 1;
      if (row.stockState === 'out_of_stock') outOfStockCount += 1;
      if (!sourceWatermark || row.sourceWatermark > sourceWatermark) sourceWatermark = row.sourceWatermark;
    }

    return {
      variantCount: rows.length,
      totalAvailableQuantity,
      totalReservedQuantity,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      sourceWatermark,
      rows,
    };
  }
}
