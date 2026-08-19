import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const ORDER_AFTER_SALES_PORT=Symbol('ORDER_AFTER_SALES_PORT');
export interface OrderAfterSalesItem{
  orderId:string;orderNumber:string;customerId:string|null;orderItemId:string;variantId:string;productId:string;
  orderedQuantity:number;unitFinalToman:number;lineTotalToman:number;
}
export interface OrderAfterSalesPort{
  item(ex:DatabaseExecutor,orderId:string,orderItemId:string,lock:boolean):Promise<OrderAfterSalesItem|null>;
}
