import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const PAYMENT_FINANCE_PORT=Symbol('PAYMENT_FINANCE_PORT');
export interface PaymentFinanceSnapshot{
  paymentId:string|null;status:string|null;amountToman:number;committedRefundToman:number;succeededRefundToman:number;
  unresolvedRefundToman:number;
}
export interface PaymentFinancePort{snapshot(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<PaymentFinanceSnapshot>;}
