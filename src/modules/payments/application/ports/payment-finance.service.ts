import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { PaymentFinancePort,PaymentFinanceSnapshot } from './payment-finance.port';
@Injectable()
export class PaymentFinanceService implements PaymentFinancePort{
  async snapshot(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<PaymentFinanceSnapshot>{
    const order=lock
      ?(await sql<any>`SELECT settlement_payment_id FROM orders.orders WHERE id=${orderId}::uuid FOR UPDATE`.execute(ex)).rows[0]
      :(await sql<any>`SELECT settlement_payment_id FROM orders.orders WHERE id=${orderId}::uuid`.execute(ex)).rows[0];
    if(!order?.settlement_payment_id)return{paymentId:null,status:null,amountToman:0,committedRefundToman:0,succeededRefundToman:0,unresolvedRefundToman:0};
    const paymentId=String(order.settlement_payment_id);
    const p=lock
      ?(await sql<any>`SELECT id,status,amount_toman FROM payments.payments WHERE id=${paymentId}::uuid FOR UPDATE`.execute(ex)).rows[0]
      :(await sql<any>`SELECT id,status,amount_toman FROM payments.payments WHERE id=${paymentId}::uuid`.execute(ex)).rows[0];
    if(!p)return{paymentId:null,status:null,amountToman:0,committedRefundToman:0,succeededRefundToman:0,unresolvedRefundToman:0};
    const s=(await sql<any>`SELECT
      COALESCE(sum(amount_toman) FILTER(WHERE status IN ('requested','approved','processing','succeeded','unknown')),0)::bigint committed,
      COALESCE(sum(amount_toman) FILTER(WHERE status='succeeded'),0)::bigint succeeded,
      COALESCE(sum(amount_toman) FILTER(WHERE status IN ('requested','approved','processing','unknown')),0)::bigint unresolved
      FROM payments.refunds WHERE payment_id=${paymentId}::uuid`.execute(ex)).rows[0];
    return{paymentId,status:String(p.status),amountToman:Number(p.amount_toman),
      committedRefundToman:Number(s?.committed??0),succeededRefundToman:Number(s?.succeeded??0),unresolvedRefundToman:Number(s?.unresolved??0)};
  }
}
