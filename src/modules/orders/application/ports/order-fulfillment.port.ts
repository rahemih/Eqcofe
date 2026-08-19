import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const ORDER_FULFILLMENT_PORT=Symbol('ORDER_FULFILLMENT_PORT');
export interface OrderFulfillmentItem {id:string;variantId:string;quantity:number;}
export interface OrderFulfillmentSnapshot {id:string;status:string;paymentStatus:string;settlementPaymentId:string|null;reservationId:string|null;items:OrderFulfillmentItem[];}
export interface OrderFulfillmentPort {getForFulfillment(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<OrderFulfillmentSnapshot|null>;}
