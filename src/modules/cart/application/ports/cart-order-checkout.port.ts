import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';

export interface CheckoutOrderLineSnapshot {
  id:string; product_id:string; variant_id:string; sku:string; product_name:string; quantity:number;
  unit_base_toman:number; unit_final_toman:number; discount_toman:number; tax_toman:number;
  tax_rule_id:string; line_total_toman:number; pricing_snapshot:unknown;
}
export interface ReservedCheckoutForOrder {
  id:string; cart_id:string; customer_id:string|null; reservation_id:string;
  subtotal_toman:number; discount_toman:number; shipping_toman:number; tax_toman:number; total_toman:number;
  items:CheckoutOrderLineSnapshot[];
}
export interface CartOrderCheckoutPort {
  loadReservedForOrder(ex:DatabaseExecutor,checkoutId:string,token:string):Promise<ReservedCheckoutForOrder>;
  finalizeOrderCreation(ex:DatabaseExecutor,checkoutId:string):Promise<void>;
  assertGuestAccess(ex:DatabaseExecutor,checkoutId:string,token:string):Promise<void>;
}
export const CART_ORDER_CHECKOUT_PORT=Symbol('CART_ORDER_CHECKOUT_PORT');
