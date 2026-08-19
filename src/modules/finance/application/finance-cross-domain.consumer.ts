import { Injectable,OnModuleInit } from '@nestjs/common';
import { sql,Transaction } from 'kysely';
import { EventConsumerRegistry } from '../../../platform/events/event-consumer.registry';
import { EventConsumer,IntegrationEvent } from '../../../platform/events/integration-event';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { ProfitCalculationService } from './profit-calculation.service';
import { ProfitFinalizationService } from './profit-finalization.service';
import { FinanceRepository } from '../infrastructure/finance.repository';

const TYPES=[
  'order.created.v1','order.submitted.v1','order.confirmed.v1','order.cancelled.v1','order.expired.v1',
  'payment.initiated.v1','payment.failed.v1','payment.paid.v1','payment.late_received.v1','payment.partially_refunded.v1','payment.refunded.v1',
  'inventory.stock.consumed.v1','inventory.return.received.v1','return.resolved.v1',
  'procurement.landed_cost.finalized.v1',
] as const;

const FINAL_INVALIDATORS=new Set<string>([
  'payment.partially_refunded.v1','payment.refunded.v1','inventory.return.received.v1','return.resolved.v1',
  'procurement.landed_cost.finalized.v1',
]);

@Injectable()
export class FinanceCrossDomainConsumer implements EventConsumer,OnModuleInit{
  readonly consumerName='finance.cross_domain.v1';
  readonly eventTypes=TYPES;
  constructor(
    private readonly registry:EventConsumerRegistry,
    private readonly calculations:ProfitCalculationService,
    private readonly finalization:ProfitFinalizationService,
    private readonly repo:FinanceRepository,
  ){}
  onModuleInit(){this.registry.register(this);}

  async handle(event:IntegrationEvent,trx:Transaction<DatabaseSchema>):Promise<void>{
    const orderIds=await this.resolveOrderIds(event,trx);
    for(const orderId of orderIds){
      if(FINAL_INVALIDATORS.has(event.event_type)){
        const currentFinal=await this.repo.currentFinalProfit(trx,orderId,true);
        if(currentFinal)await this.finalization.reverseInTransaction(trx,orderId,`cross-domain:${event.event_type}:${event.event_id}`);
      }
      await this.calculations.calculateInTransaction(trx,orderId,`cross-domain:${event.event_type}:${event.event_id}`);
    }
  }

  private async resolveOrderIds(event:IntegrationEvent,trx:Transaction<DatabaseSchema>):Promise<string[]>{
    const p=(event.payload??{}) as Record<string,unknown>;
    if(typeof p.order_id==='string')return[p.order_id];
    if(typeof p.order_item_id==='string'){
      const r=await sql<any>`SELECT order_id FROM orders.order_items WHERE id=${p.order_item_id}::uuid`.execute(trx);
      return r.rows[0]?.order_id?[String(r.rows[0].order_id)]:[];
    }
    if(typeof p.return_id==='string'){
      const r=await sql<any>`SELECT order_id FROM returns.returns WHERE id=${p.return_id}::uuid`.execute(trx);
      return r.rows[0]?.order_id?[String(r.rows[0].order_id)]:[];
    }
    if(event.event_type==='procurement.landed_cost.finalized.v1'&&typeof p.landed_cost_id==='string'){
      const r=await sql<any>`SELECT DISTINCT oi.order_id
        FROM procurement.landed_cost_allocations lca
        JOIN inventory.cost_layers cl ON cl.goods_receipt_item_id=lca.goods_receipt_item_id
        JOIN inventory.cost_layer_consumptions c ON c.cost_layer_id=cl.id
        JOIN orders.order_items oi ON oi.id=c.order_item_id
        WHERE lca.landed_cost_id=${p.landed_cost_id}::uuid`.execute(trx);
      return r.rows.map((x:any)=>String(x.order_id));
    }
    return[];
  }
}
