import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const ORDER_WARRANTY_PORT=Symbol('ORDER_WARRANTY_PORT');
export interface OrderWarrantyItemSnapshot{
  orderId:string;orderNumber:string;customerId:string|null;orderStatus:string;orderItemId:string;
  quantity:number;productId:string;variantId:string;unitFinalToman:number;lineTotalToman:number;
}
export interface OrderWarrantyPort{
  getOwnedItemForWarranty(ex:DatabaseExecutor,orderItemId:string,customerId:string,lock:boolean):Promise<OrderWarrantyItemSnapshot|null>;
}
