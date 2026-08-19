import { Inject,Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { PAYMENT_AFTER_SALES_PORT,PaymentAfterSalesPort } from '../../payments/application/ports/payment-after-sales.port';
import { INVENTORY_AFTER_SALES_PORT,InventoryAfterSalesPort } from '../../inventory/application/ports/inventory-after-sales.port';
import { FULFILLMENT_AFTER_SALES_PORT,FulfillmentAfterSalesPort } from '../../fulfillment/application/ports/fulfillment-after-sales.port';
import { ORDER_AFTER_SALES_PORT,OrderAfterSalesPort } from '../../orders/application/ports/order-after-sales.port';

@Injectable()
export class AfterSalesIntegrationService{
  constructor(
    @Inject(PAYMENT_AFTER_SALES_PORT) readonly payments:PaymentAfterSalesPort,
    @Inject(INVENTORY_AFTER_SALES_PORT) readonly inventory:InventoryAfterSalesPort,
    @Inject(FULFILLMENT_AFTER_SALES_PORT) readonly fulfillment:FulfillmentAfterSalesPort,
    @Inject(ORDER_AFTER_SALES_PORT) readonly orders:OrderAfterSalesPort,
    private readonly outbox:OutboxWriter,
    private readonly ctx:RequestContextStore,
  ){}

  async eligibilitySnapshot(ex:DatabaseExecutor,input:{orderId:string;orderItemId:string;quantity:number;lock:boolean}){
    const delivery=await this.fulfillment.deliveredItem(ex,input.orderId,input.orderItemId,input.lock);
    const payment=await this.payments.settlementForOrder(ex,input.orderId,input.lock);
    const costPlan=await this.inventory.returnCostPlan(ex,{orderItemId:input.orderItemId,quantity:input.quantity,lock:input.lock});
    return{delivery,payment,costPlan};
  }


  async orderItem(ex:DatabaseExecutor,orderId:string,orderItemId:string,lock:boolean){
    const item=await this.orders.item(ex,orderId,orderItemId,lock);
    if(!item)throw new DomainError('ORDER_ITEM_NOT_FOUND','قلم سفارش پیدا نشد.');
    return item;
  }
  maxRefundForQuantity(item:{lineTotalToman:number;orderedQuantity:number},quantity:number){
    const q=Number(quantity);
    if(!Number.isInteger(q)||q<=0||q>item.orderedQuantity)throw new DomainError('REFUND_QUANTITY_INVALID','تعداد بازپرداخت معتبر نیست.');
    return Math.floor((item.lineTotalToman*q)/item.orderedQuantity);
  }

  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}

  async requestReplacementInTransaction(ex:DatabaseExecutor,input:{
    sourceType:'return_item'|'warranty_claim';sourceId:string;orderId:string;orderItemId:string;customerId:string;
    variantId:string;quantity:number;note?:string|null;
  }){
    const q=Number(input.quantity);
    if(!Number.isInteger(q)||q<=0)throw new DomainError('REPLACEMENT_QUANTITY_INVALID','تعداد جایگزینی معتبر نیست.');
    const existing=(await sql<any>`SELECT * FROM after_sales.replacements WHERE source_type=${input.sourceType} AND source_id=${input.sourceId}::uuid FOR UPDATE`.execute(ex)).rows[0];
    if(existing)return existing;
    const id=randomUUID();
    const r=await sql<any>`INSERT INTO after_sales.replacements(id,source_type,source_id,order_id,order_item_id,customer_id,variant_id,quantity,status,note)
      VALUES(${id}::uuid,${input.sourceType},${input.sourceId}::uuid,${input.orderId}::uuid,${input.orderItemId}::uuid,${input.customerId}::uuid,${input.variantId}::uuid,${q},'requested',${input.note??null})
      RETURNING *`.execute(ex);
    await this.outbox.append(ex,[{eventType:'after_sales.replacement.requested.v1',eventVersion:1,aggregateType:'replacement',
      aggregateId:id,aggregateVersion:1,occurredAt:new Date(),payload:{replacement_id:id,source_type:input.sourceType,source_id:input.sourceId,
      order_id:input.orderId,order_item_id:input.orderItemId,customer_id:input.customerId,variant_id:input.variantId,quantity:q,status:'requested'}}],this.context());
    return r.rows[0];
  }
}
