import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const INVENTORY_FULFILLMENT_PORT=Symbol('INVENTORY_FULFILLMENT_PORT');
export interface InventoryFulfillmentAllocation {id:string;orderItemId:string;warehouseId:string;variantId:string;quantity:number;status:'allocated'|'picked'|'shipped'|'released';}
export interface InventoryFulfillmentPlanLine {orderItemId:string;variantId:string;quantity:number;}
export interface InventoryFulfillmentPort {
  allocation(ex:DatabaseExecutor,id:string,lock:boolean):Promise<InventoryFulfillmentAllocation|null>;
  planSingleWarehousePreferred(ex:DatabaseExecutor,input:{reservationId:string;items:InventoryFulfillmentPlanLine[]}):Promise<{orderItemId:string;warehouseId:string;variantId:string;quantity:number}[]>;
  allocate(ex:DatabaseExecutor,input:{orderItemId:string;warehouseId:string;variantId:string;quantity:number;reservationId?:string|null}):Promise<InventoryFulfillmentAllocation>;
  markPicked(ex:DatabaseExecutor,id:string):Promise<void>;
  markAllocated(ex:DatabaseExecutor,id:string):Promise<void>;
  consumeForShipment(ex:DatabaseExecutor,input:{allocationId:string;quantity:number;complete:boolean}):Promise<{allocationId:string;quantity:number;totalCostToman:number;status:'allocated'|'picked'|'shipped'}>;
}
