import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../../platform/outbox/outbox-writer';
import { ScopePolicy } from '../../../../platform/auth/scope-policy';
import { DomainError } from '../../../../shared/errors/domain-error';
import { InventoryRepository } from '../../infrastructure/inventory.repository';
import { inventoryEvent } from '../../domain/inventory.events';
import { InventoryFulfillmentAllocation,InventoryFulfillmentPort,InventoryFulfillmentPlanLine } from './inventory-fulfillment.port';

@Injectable()
export class InventoryFulfillmentService implements InventoryFulfillmentPort {
  constructor(private readonly repo:InventoryRepository,private readonly ctx:RequestContextStore,private readonly outbox:OutboxWriter,private readonly scopes:ScopePolicy){}

  async allocation(ex:DatabaseExecutor,id:string,lock:boolean):Promise<InventoryFulfillmentAllocation|null>{const a=await this.repo.allocation(ex,id,lock);return a?this.map(a):null;}

  async planSingleWarehousePreferred(ex:DatabaseExecutor,input:{reservationId:string;items:InventoryFulfillmentPlanLine[]}):Promise<{orderItemId:string;warehouseId:string;variantId:string;quantity:number}[]>{
    const reservation=await this.repo.reservation(ex,input.reservationId,true);if(!reservation||reservation.status!=='converted')throw new DomainError('RESERVATION_NOT_CONVERTIBLE','رزرو تبدیل‌شده متناظر پیدا نشد.');
    const rows=await this.repo.reservationItems(ex,input.reservationId);const active=await this.repo.allocationsForOrderItems(ex,input.items.map(x=>x.orderItemId));
    const allocatedByItem=new Map<string,number>();for(const a of active)if(a.status!=='released')allocatedByItem.set(String(a.order_item_id),(allocatedByItem.get(String(a.order_item_id))??0)+Number(a.quantity));
    const remaining=input.items.map(x=>({...x,remaining:x.quantity-(allocatedByItem.get(x.orderItemId)??0)}));
    for(const x of remaining)if(x.remaining<0)throw new DomainError('FULFILLMENT_ALLOCATION_OVERFLOW','تخصیص ثبت‌شده از تعداد قلم سفارش بیشتر است.');
    const reservationByVariant=new Map<string,any[]>();for(const r of rows){const arr=reservationByVariant.get(String(r.variant_id))??[];arr.push(r);reservationByVariant.set(String(r.variant_id),arr);}
    const warehouses=[...new Set(rows.map((r:any)=>String(r.warehouse_id)))].sort();
    const candidate=warehouses.find(w=>remaining.every(x=>x.remaining===0||(reservationByVariant.get(x.variantId)??[]).some((r:any)=>String(r.warehouse_id)===w&&Number(r.quantity)-Number(r.allocated_quantity)-Number(r.released_quantity??0)>=x.remaining)));
    const plan:{orderItemId:string;warehouseId:string;variantId:string;quantity:number}[]=[];
    if(candidate){for(const x of remaining)if(x.remaining>0)plan.push({orderItemId:x.orderItemId,warehouseId:candidate,variantId:x.variantId,quantity:x.remaining});}
    else {
      for(const x of remaining){let need=x.remaining;const choices=[...(reservationByVariant.get(x.variantId)??[])].sort((a:any,b:any)=>String(a.warehouse_id).localeCompare(String(b.warehouse_id)));for(const r of choices){if(need<=0)break;const available=Number(r.quantity)-Number(r.allocated_quantity)-Number(r.released_quantity??0);if(available<=0)continue;const q=Math.min(available,need);plan.push({orderItemId:x.orderItemId,warehouseId:String(r.warehouse_id),variantId:x.variantId,quantity:q});need-=q;}if(need>0)throw new DomainError('INSUFFICIENT_RESERVED_STOCK','تعهد رزرو برای تخصیص کامل سفارش کافی نیست.',{order_item_id:x.orderItemId,remaining:need});}
    }
    for(const p of plan)this.scopes.assert(this.ctx.get()?.actor,'warehouse',p.warehouseId);return plan;
  }

  async allocate(ex:DatabaseExecutor,input:{orderItemId:string;warehouseId:string;variantId:string;quantity:number;reservationId?:string|null}):Promise<InventoryFulfillmentAllocation>{
    this.scopes.assert(this.ctx.get()?.actor,'warehouse',input.warehouseId);if(!Number.isInteger(input.quantity)||input.quantity<=0)throw new DomainError('INVALID_QUANTITY','تعداد تخصیص نامعتبر است.');
    const id=randomUUID(),context=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};const balance=await this.repo.lockBalance(ex,input.warehouseId,input.variantId);
    if(input.reservationId){const item=await this.repo.reservationItemForAllocation(ex,input.reservationId,input.warehouseId,input.variantId);if(!item)throw new DomainError('RESERVATION_NOT_CONVERTIBLE','رزرو تبدیل‌شده متناظر پیدا نشد.');const remaining=Number(item.quantity)-Number(item.allocated_quantity)-Number(item.released_quantity??0);if(remaining<input.quantity||Number(balance.reserved)<input.quantity)throw new DomainError('RESERVATION_ALLOCATION_EXCEEDED','موجودی رزروشده کافی نیست.');await this.repo.addReservationAllocated(ex,item.id,input.quantity);await this.repo.updateBalance(ex,input.warehouseId,input.variantId,{reserved:-input.quantity,allocated:input.quantity});}
    else throw new DomainError('FULFILLMENT_RESERVATION_REQUIRED','تخصیص Fulfillment باید از تعهد رزرو سفارش انجام شود.');
    await this.repo.createAllocation(ex,{id,orderItemId:input.orderItemId,reservationId:input.reservationId,warehouseId:input.warehouseId,variantId:input.variantId,quantity:input.quantity});
    await this.outbox.append(ex,[inventoryEvent('inventory.allocated.v1','allocation',id,1,{allocation_id:id,order_item_id:input.orderItemId,warehouse_id:input.warehouseId,variant_id:input.variantId,quantity:input.quantity,reservation_id:input.reservationId})],context);
    return{id,orderItemId:input.orderItemId,warehouseId:input.warehouseId,variantId:input.variantId,quantity:input.quantity,status:'allocated'};
  }

  async markPicked(ex:DatabaseExecutor,id:string):Promise<void>{const a=await this.repo.allocation(ex,id,true);if(!a)throw new DomainError('ALLOCATION_NOT_FOUND','تخصیص پیدا نشد.');this.scopes.assert(this.ctx.get()?.actor,'warehouse',a.warehouse_id);if(a.status==='picked')return;if(a.status!=='allocated')throw new DomainError('INVALID_STATE_TRANSITION','تخصیص در وضعیت قابل Pick نیست.');await this.repo.setAllocationStatus(ex,id,'picked');await this.emitState(ex,a,'picked','inventory.picked.v1');}
  async markAllocated(ex:DatabaseExecutor,id:string):Promise<void>{const a=await this.repo.allocation(ex,id,true);if(!a)throw new DomainError('ALLOCATION_NOT_FOUND','تخصیص پیدا نشد.');this.scopes.assert(this.ctx.get()?.actor,'warehouse',a.warehouse_id);if(a.status==='allocated')return;if(a.status!=='picked')throw new DomainError('INVALID_STATE_TRANSITION','تخصیص در وضعیت قابل Unpick نیست.');await this.repo.setAllocationStatus(ex,id,'allocated');await this.emitState(ex,a,'allocated','inventory.unpicked.v1');}

async consumeForShipment(ex:DatabaseExecutor,input:{allocationId:string;quantity:number;complete:boolean}):Promise<{allocationId:string;quantity:number;totalCostToman:number;status:'allocated'|'picked'|'shipped'}>{
  const q=Number(input.quantity);if(!Number.isInteger(q)||q<=0)throw new DomainError('INVALID_QUANTITY','تعداد خروج مرسوله نامعتبر است.');
  const a=await this.repo.allocation(ex,input.allocationId,true);if(!a)throw new DomainError('ALLOCATION_NOT_FOUND','تخصیص پیدا نشد.');
  this.scopes.assert(this.ctx.get()?.actor,'warehouse',String(a.warehouse_id));
  if(!['allocated','picked'].includes(String(a.status)))throw new DomainError('INVALID_STATE_TRANSITION','تخصیص در وضعیت قابل خروج از انبار نیست.');
  const b=await this.repo.lockBalance(ex,String(a.warehouse_id),String(a.variant_id));
  if(Number(b.allocated)<q)throw new DomainError('INSUFFICIENT_ALLOCATION','موجودی تخصیص‌یافته کافی نیست.');

  let need=q,total=0;
  const parts:{layerId:string;quantity:number;unitCostToman:number}[]=[];
  for(const layer of await this.repo.fifoLayers(ex,String(a.warehouse_id),String(a.variant_id),'sellable')){
    if(need<=0)break;const take=Math.min(need,Number(layer.remaining_quantity));if(take<=0)continue;
    await this.repo.consumeLayer(ex,String(layer.id),take);
    parts.push({layerId:String(layer.id),quantity:take,unitCostToman:Number(layer.effective_unit_cost_toman)});
    need-=take;
  }
  if(need>0)throw new DomainError('INSUFFICIENT_COST_LAYERS','لایه هزینه کافی برای خروج مرسوله وجود ندارد.');

  await this.repo.updateBalance(ex,String(a.warehouse_id),String(a.variant_id),{onHand:-q,allocated:-q});
  const movementIds:string[]=[];
  for(const part of parts){
    const mid=randomUUID();movementIds.push(mid);total+=part.quantity*part.unitCostToman;
    await this.repo.movement(ex,{id:mid,warehouseId:String(a.warehouse_id),variantId:String(a.variant_id),type:'sale',quantityDelta:-part.quantity,costLayerId:part.layerId,allocationId:String(a.id)});
    await this.repo.insertCostConsumption(ex,{id:randomUUID(),costLayerId:part.layerId,orderItemId:String(a.order_item_id),movementId:mid,quantity:part.quantity,unitCostToman:part.unitCostToman});
  }
  if(input.complete)await this.repo.setAllocationStatus(ex,String(a.id),'shipped');

  const c=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};
  await this.outbox.append(ex,[inventoryEvent('inventory.stock.consumed.v1','allocation',String(a.id),Number(a.version)+1,{
    allocation_id:String(a.id),warehouse_id:String(a.warehouse_id),variant_id:String(a.variant_id),order_item_id:String(a.order_item_id),
    quantity:q,total_cost_toman:total,partial:!input.complete,movement_ids:movementIds
  })],c);
  return{allocationId:String(a.id),quantity:q,totalCostToman:total,status:input.complete?'shipped':String(a.status) as 'allocated'|'picked'};
}

  private async emitState(ex:DatabaseExecutor,a:any,status:string,eventType:string){const c=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};await this.outbox.append(ex,[inventoryEvent(eventType,'allocation',String(a.id),Number(a.version)+1,{allocation_id:String(a.id),status})],c);}
  private map(a:any):InventoryFulfillmentAllocation{return{id:String(a.id),orderItemId:String(a.order_item_id),warehouseId:String(a.warehouse_id),variantId:String(a.variant_id),quantity:Number(a.quantity),status:a.status};}
}
