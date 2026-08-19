import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OutboxWriter } from '../../../../platform/outbox/outbox-writer';
import { RequestContextStore } from '../../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../../platform/audit/audit.writer';
import { DomainError } from '../../../../shared/errors/domain-error';
import { AfterSalesPaymentSnapshot,AfterSalesRefundRequest,PaymentAfterSalesPort } from './payment-after-sales.port';
@Injectable()
export class PaymentAfterSalesService implements PaymentAfterSalesPort{
  constructor(private readonly outbox:OutboxWriter,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  async settlementForOrder(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<AfterSalesPaymentSnapshot|null>{
    const r=lock?await sql<any>`SELECT p.* FROM orders.orders o JOIN payments.payments p ON p.id=o.settlement_payment_id WHERE o.id=${orderId}::uuid FOR UPDATE OF p`.execute(ex)
      :await sql<any>`SELECT p.* FROM orders.orders o JOIN payments.payments p ON p.id=o.settlement_payment_id WHERE o.id=${orderId}::uuid`.execute(ex);
    const p=r.rows[0];if(!p)return null;
    const sums=(await sql<any>`SELECT COALESCE(sum(amount_toman) FILTER(WHERE status IN ('requested','approved','processing','succeeded','unknown')),0)::bigint committed FROM payments.refunds WHERE payment_id=${p.id}::uuid`.execute(ex)).rows[0];
    const amount=Number(p.amount_toman),committed=Number(sums?.committed??0);
    return{paymentId:String(p.id),orderId:String(p.order_id),providerKey:String(p.provider_key),status:String(p.status),amountToman:amount,committedRefundToman:committed,refundableToman:Math.max(amount-committed,0)};
  }
  async requestRefundInTransaction(ex:DatabaseExecutor,input:{orderId:string;amountToman:number;reasonCode:string}):Promise<AfterSalesRefundRequest>{
    const amount=Number(input.amountToman),reason=String(input.reasonCode??'').trim();
    if(!Number.isSafeInteger(amount)||amount<=0)throw new DomainError('REFUND_AMOUNT_INVALID','مبلغ بازپرداخت معتبر نیست.');
    if(!reason||reason.length>200)throw new DomainError('REFUND_REASON_INVALID','دلیل بازپرداخت معتبر نیست.');
    const payment=await this.settlementForOrder(ex,input.orderId,true);if(!payment)throw new DomainError('PAYMENT_SETTLEMENT_NOT_FOUND','پرداخت نهایی سفارش پیدا نشد.');
    if(!['paid','late_received','refund_required','partially_refunded','refunded'].includes(payment.status))throw new DomainError('PAYMENT_NOT_REFUNDABLE','پرداخت در وضعیت قابل بازپرداخت نیست.');
    if(amount>payment.refundableToman)throw new DomainError('REFUND_CAP_EXCEEDED','مبلغ بازپرداخت از مانده قابل بازپرداخت بیشتر است.',{refundable_toman:payment.refundableToman});
    const id=randomUUID(),c=this.context();
    await sql`INSERT INTO payments.refunds(id,payment_id,provider_key,amount_toman,status,reason_code,created_by) VALUES(${id}::uuid,${payment.paymentId}::uuid,${payment.providerKey},${amount},'requested',${reason},${c.actor.id??null}::uuid)`.execute(ex);
    await sql`SELECT payments.assert_refund_cap(${payment.paymentId}::uuid)`.execute(ex);
    await this.audit.writeWith(ex,{actorType:c.actor.type,actorId:c.actor.id,action:'refund.create.after_sales',resourceType:'refund',resourceId:id,afterData:{payment_id:payment.paymentId,order_id:input.orderId,amount_toman:amount,reason_code:reason},reason,requestId:c.requestId,traceId:c.traceId});
    await this.outbox.append(ex,[{eventType:'refund.requested.v1',eventVersion:1,aggregateType:'refund',aggregateId:id,aggregateVersion:1,occurredAt:new Date(),payload:{refund_id:id,payment_id:payment.paymentId,order_id:input.orderId,amount_toman:amount,reason_code:reason,source:'after_sales'}}],c);
    return{refundId:id,paymentId:payment.paymentId,orderId:input.orderId,amountToman:amount,reasonCode:reason,status:'requested'};
  }
}
