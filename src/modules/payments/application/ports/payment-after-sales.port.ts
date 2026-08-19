import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const PAYMENT_AFTER_SALES_PORT=Symbol('PAYMENT_AFTER_SALES_PORT');
export interface AfterSalesPaymentSnapshot{paymentId:string;orderId:string;providerKey:string;status:string;amountToman:number;committedRefundToman:number;refundableToman:number;}
export interface AfterSalesRefundRequest{refundId:string;paymentId:string;orderId:string;amountToman:number;reasonCode:string;status:'requested';}
export interface PaymentAfterSalesPort{
  settlementForOrder(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<AfterSalesPaymentSnapshot|null>;
  requestRefundInTransaction(ex:DatabaseExecutor,input:{orderId:string;amountToman:number;reasonCode:string}):Promise<AfterSalesRefundRequest>;
}
