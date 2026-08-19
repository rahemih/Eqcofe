import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OutboxWriter } from '../../../../platform/outbox/outbox-writer';
import { RequestContextStore } from '../../../../platform/request-context/request-context.store';
import { DomainError } from '../../../../shared/errors/domain-error';
import { InventoryAfterSalesPort,ReturnCostSlice,ReturnStockBucket } from './inventory-after-sales.port';
@Injectable()
export class InventoryAfterSalesService implements InventoryAfterSalesPort{
  constructor(private readonly outbox:OutboxWriter,private readonly ctx:RequestContextStore){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  async returnCostPlan(ex:DatabaseExecutor,input:{orderItemId:string;quantity:number;lock:boolean}):Promise<ReturnCostSlice[]>{
    const q=Number(input.quantity);if(!Number.isInteger(q)||q<=0)throw new DomainError('INVALID_QUANTITY','تعداد برگشتی معتبر نیست.');
    if(input.lock)await sql`SELECT c.id FROM inventory.cost_layer_consumptions c WHERE c.order_item_id=${input.orderItemId}::uuid ORDER BY c.created_at,c.id FOR UPDATE OF c`.execute(ex);
    const rows=(await sql<any>`SELECT c.id,c.quantity,c.unit_cost_toman,COALESCE((SELECT sum(cl.received_quantity)::int FROM inventory.cost_layers cl WHERE cl.return_parent_consumption_id=c.id),0)::int already_returned FROM inventory.cost_layer_consumptions c WHERE c.order_item_id=${input.orderItemId}::uuid ORDER BY c.created_at,c.id`.execute(ex)).rows;
    let need=q;const out:ReturnCostSlice[]=[];
    for(const r of rows){if(need<=0)break;const available=Math.max(Number(r.quantity)-Number(r.already_returned),0);if(available<=0)continue;const take=Math.min(need,available);out.push({consumptionId:String(r.id),quantity:take,unitCostToman:Number(r.unit_cost_toman)});need-=take;}
    if(need>0)throw new DomainError('RETURN_COST_LINEAGE_INSUFFICIENT','سابقه بهای تمام‌شده برای تعداد برگشتی کافی نیست.');
    return out;
  }
  async receiveReturnInTransaction(ex:DatabaseExecutor,input:{returnItemId:string;orderItemId:string;warehouseId:string;variantId:string;quantity:number;bucket:ReturnStockBucket;reasonCode:string}){
    const q=Number(input.quantity),reason=String(input.reasonCode??'').trim();
    if(!Number.isInteger(q)||q<=0)throw new DomainError('INVALID_QUANTITY','تعداد برگشتی معتبر نیست.');
    if(!['sellable','quarantine','damaged'].includes(input.bucket))throw new DomainError('RETURN_BUCKET_INVALID','وضعیت موجودی برگشتی معتبر نیست.');
    if(!reason||reason.length>80)throw new DomainError('VALIDATION_ERROR','دلیل ورود کالای برگشتی معتبر نیست.');
    const plan=await this.returnCostPlan(ex,{orderItemId:input.orderItemId,quantity:q,lock:true});
    const movementIds:string[]=[],costLayerIds:string[]=[];
    for(const part of plan){
      const layerId=randomUUID(),movementId=randomUUID();costLayerIds.push(layerId);movementIds.push(movementId);
      await sql`INSERT INTO inventory.cost_layers(id,warehouse_id,variant_id,return_parent_consumption_id,stock_bucket,received_quantity,remaining_quantity,base_unit_cost_toman,landed_unit_cost_toman,effective_unit_cost_toman,received_at) VALUES(${layerId}::uuid,${input.warehouseId}::uuid,${input.variantId}::uuid,${part.consumptionId}::uuid,${input.bucket},${part.quantity},${part.quantity},${part.unitCostToman},${part.unitCostToman},${part.unitCostToman},now())`.execute(ex);
      await sql`INSERT INTO inventory.movements(id,warehouse_id,variant_id,movement_type,quantity_delta,bucket_to,cost_layer_id,return_item_id,reason_code) VALUES(${movementId}::uuid,${input.warehouseId}::uuid,${input.variantId}::uuid,'return',${part.quantity},${input.bucket},${layerId}::uuid,${input.returnItemId}::uuid,${reason})`.execute(ex);
    }
    await sql`INSERT INTO inventory.stock_balances(warehouse_id,variant_id,on_hand,reserved,allocated,quarantine,damaged) VALUES(${input.warehouseId}::uuid,${input.variantId}::uuid,${q},0,0,${input.bucket==='quarantine'?q:0},${input.bucket==='damaged'?q:0}) ON CONFLICT(warehouse_id,variant_id) DO UPDATE SET on_hand=inventory.stock_balances.on_hand+${q},quarantine=inventory.stock_balances.quarantine+${input.bucket==='quarantine'?q:0},damaged=inventory.stock_balances.damaged+${input.bucket==='damaged'?q:0},version=inventory.stock_balances.version+1,updated_at=now()`.execute(ex);
    const c=this.context();await this.outbox.append(ex,[{eventType:'inventory.return.received.v1',eventVersion:1,aggregateType:'return_item',aggregateId:input.returnItemId,aggregateVersion:1,occurredAt:new Date(),payload:{return_item_id:input.returnItemId,order_item_id:input.orderItemId,warehouse_id:input.warehouseId,variant_id:input.variantId,quantity:q,bucket:input.bucket,movement_ids:movementIds,cost_layer_ids:costLayerIds}}],c);
    return{movementIds,costLayerIds,quantity:q};
  }
}
