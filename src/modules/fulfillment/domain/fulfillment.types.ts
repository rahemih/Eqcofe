export type FulfillmentStatus='unfulfilled'|'partially_allocated'|'allocated'|'preparing'|'partially_shipped'|'shipped'|'partially_delivered'|'delivered'|'cancelled';
export type InventoryAllocationStatus='allocated'|'picked'|'shipped'|'released';

export interface FulfillmentLineState {
  orderItemId:string;
  ordered:number;
  allocated:number;
  picked:number;
  shipped:number;
  delivered:number;
}

export interface AllocationState {
  id:string;
  orderId:string;
  orderItemId:string;
  warehouseId:string;
  variantId:string;
  quantity:number;
  inventoryStatus:InventoryAllocationStatus;
  pickedQuantity:number;
  shippedQuantity:number;
}
