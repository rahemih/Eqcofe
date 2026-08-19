import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const INVENTORY_AFTER_SALES_PORT=Symbol('INVENTORY_AFTER_SALES_PORT');
export type ReturnStockBucket='sellable'|'quarantine'|'damaged';
export interface ReturnCostSlice{consumptionId:string;quantity:number;unitCostToman:number;}
export interface InventoryAfterSalesPort{
  returnCostPlan(ex:DatabaseExecutor,input:{orderItemId:string;quantity:number;lock:boolean}):Promise<ReturnCostSlice[]>;
  receiveReturnInTransaction(ex:DatabaseExecutor,input:{returnItemId:string;orderItemId:string;warehouseId:string;variantId:string;quantity:number;bucket:ReturnStockBucket;reasonCode:string}):Promise<{movementIds:string[];costLayerIds:string[];quantity:number;}>;
}
