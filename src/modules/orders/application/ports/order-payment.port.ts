import type { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const ORDER_PAYMENT_PORT=Symbol('ORDER_PAYMENT_PORT');
export interface PayableOrder {id:string;order_number:string;customer_id:string|null;reservation_id:string;status:string;total_toman:number;confirmation_expires_at:string;version:number;}
export interface OrderPaymentPort {
 loadPayable(orderNumber:string,access:{customerId?:string;checkoutToken?:string}):Promise<PayableOrder>;
 loadById(orderId:string):Promise<PayableOrder>;
 markPaymentState(ex:DatabaseExecutor,orderId:string,state:'unpaid'|'pending'|'partially_refunded'|'refund_required'|'refunded',paymentId?:string):Promise<void>;
 markPaymentAttemptFailed(ex:DatabaseExecutor,orderId:string,paymentId:string):Promise<void>;
 claimSettlement(ex:DatabaseExecutor,orderId:string,paymentId:string):Promise<{owned:boolean;settlement_payment_id:string|null}>;
 confirmPaid(ex:DatabaseExecutor,orderId:string,paymentId:string):Promise<{order_id:string;status:string;reservation_id:string;late:boolean}>;
}
