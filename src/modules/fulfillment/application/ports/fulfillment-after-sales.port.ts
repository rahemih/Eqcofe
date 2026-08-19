import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const FULFILLMENT_AFTER_SALES_PORT=Symbol('FULFILLMENT_AFTER_SALES_PORT');
export interface DeliveredAfterSalesSnapshot{orderId:string;orderItemId:string;deliveredQuantity:number;lastDeliveredAt:Date|null;sourceWarehouses:string[];}
export interface FulfillmentAfterSalesPort{deliveredItem(ex:DatabaseExecutor,orderId:string,orderItemId:string,lock:boolean):Promise<DeliveredAfterSalesSnapshot>;}
