export type StockState = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface SalesDailyMetric {
  businessDate: string;
  orderCount: number;
  grossSalesToman: number;
  paidSalesToman: number;
  cancelledCount: number;
  sourceWatermark: Date;
}

export interface InventorySnapshotMetric {
  variantId: string;
  availableQuantity: number;
  reservedQuantity: number;
  stockState: StockState;
  sourceWatermark: Date;
  capturedAt: Date;
}

export interface CustomerMetric {
  customerId: string;
  orderCount: number;
  lifetimeValueToman: number;
  lastOrderAt: Date | null;
  sourceWatermark: Date;
}

export interface ProfitDailyMetric {
  businessDate: string;
  revenueToman: number;
  cogsToman: number;
  operatingCostToman: number;
  profitToman: number;
  sourceWatermark: Date;
}

export interface ProjectionCheckpoint {
  projectionKey: string;
  sourceCursor: string;
  projectedAt: Date;
}
