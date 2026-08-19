import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';

export const ORDER_RETURNS_PORT=Symbol('ORDER_RETURNS_PORT');

export interface OrderReturnsItem{
  id:string;
  quantity:number;
  variantId:string;
  productId:string;
  unitFinalToman:number;
  lineTotalToman:number;
}
export interface OrderReturnsSnapshot{
  id:string;
  orderNumber:string;
  customerId:string|null;
  status:string;
  items:OrderReturnsItem[];
}
export interface OrderReturnsPort{
  getOwnedForReturn(ex:DatabaseExecutor,orderNumber:string,customerId:string,lock:boolean):Promise<OrderReturnsSnapshot|null>;
}
