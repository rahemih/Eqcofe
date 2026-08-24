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

export type WholesaleApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface WholesaleApplicationMetric {
  applicationId: string;
  customerId: string;
  status: WholesaleApplicationStatus;
  submittedAt: Date;
  reviewStartedAt: Date | null;
  reviewedAt: Date | null;
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

export interface OperationalMetric {
  id: string;
  orderId: string;
  customerId?: string;
  warehouseId?: string;
  carrierProviderId?: string | null;
  status: string;
  startedAt: Date;
  milestoneAt: Date | null;
  completedAt: Date | null;
  sourceVersion: number;
  sourceWatermark: Date;
  timestamps: Record<string, Date | null>;
}
