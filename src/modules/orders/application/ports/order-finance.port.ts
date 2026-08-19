import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const ORDER_FINANCE_PORT=Symbol('ORDER_FINANCE_PORT');

export interface OrderFinanceRuleItem{
  orderItemId:string;
  productId:string;
  brandId:string|null;
  categoryIds:string[];
}
export interface OrderFinanceSnapshot{
  orderId:string;orderNumber:string;status:string;subtotalToman:number;discountToman:number;
  merchandiseRevenueToman:number;shippingToman:number;taxToman:number;totalToman:number;createdAt:Date;
}
export interface OrderFinancePort{
  snapshot(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<OrderFinanceSnapshot|null>;
  ruleContext(ex:DatabaseExecutor,orderId:string):Promise<OrderFinanceRuleItem[]>;
}
