import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { physicalAvailable, consumeFifo } from '../domain/inventory.math';
import { inventoryEvent } from '../domain/inventory.events';
import { ScopePolicy } from '../../../platform/auth/scope-policy';

@Injectable()
export class AllocationTransferService {
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:InventoryRepository,
    private readonly ctx:RequestContextStore,
    private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,
    private readonly scopes:ScopePolicy,
  ){}

  allocations(orderItemId?:string){const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return this.repo.listAllocations(orderItemId,allowed);}
  transfers(){const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return this.repo.listTransfers(allowed);}
  async transfer(id:string){const t=await this.repo.transferView(id);if(!t)return null;this.scopes.assert(this.ctx.get()?.actor,'warehouse',t.source_warehouse_id);this.scopes.assert(this.ctx.get()?.actor,'warehouse',t.destination_warehouse_id);return t;}

  async allocate(input:{order_item_id:string;warehouse_id:string;variant_id:string;quantity:number;reservation_id?:string}){
    this.scopes.assert(this.ctx.get()?.actor,'warehouse',input.warehouse_id);
    if(!Number.isInteger(input.quantity)||input.quantity<=0)throw new DomainError('INVALID_QUANTITY','تعداد تخصیص نامعتبر است.');
    const id=randomUUID(), context=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};
    return this.tx.run(async trx=>{
      const balance=await this.repo.lockBalance(trx,input.warehouse_id,input.variant_id);
      if(input.reservation_id){
        const item=await this.repo.reservationItemForAllocation(trx,input.reservation_id,input.warehouse_id,input.variant_id);
        if(!item)throw new DomainError('RESERVATION_NOT_CONVERTIBLE','رزرو تبدیل‌شده متناظر پیدا نشد.');
        const remaining=Number(item.quantity)-Number(item.allocated_quantity);
        if(remaining<input.quantity||Number(balance.reserved)<input.quantity)throw new DomainError('RESERVATION_ALLOCATION_EXCEEDED','موجودی رزروشده کافی نیست.');
        await this.repo.addReservationAllocated(trx,item.id,input.quantity);
        await this.repo.updateBalance(trx,input.warehouse_id,input.variant_id,{reserved:-input.quantity,allocated:input.quantity});
      }else{
        const available=physicalAvailable({onHand:Number(balance.on_hand),reserved:Number(balance.reserved),allocated:Number(balance.allocated),damaged:Number(balance.damaged),quarantine:Number(balance.quarantine)});
        if(available<input.quantity)throw new DomainError('INSUFFICIENT_STOCK','موجودی آزاد کافی نیست.');
        await this.repo.updateBalance(trx,input.warehouse_id,input.variant_id,{allocated:input.quantity});
      }
      await this.repo.createAllocation(trx,{id,orderItemId:input.order_item_id,reservationId:input.reservation_id,warehouseId:input.warehouse_id,variantId:input.variant_id,quantity:input.quantity});
      await this.outbox.append(trx,[inventoryEvent('inventory.allocated.v1','allocation',id,1,{allocation_id:id,order_item_id:input.order_item_id,warehouse_id:input.warehouse_id,variant_id:input.variant_id,quantity:input.quantity,reservation_id:input.reservation_id??null})],context);
      return{id,status:'allocated'};
    });
  }

  pick(id:string){return this.changeAllocation(id,'allocated','picked','inventory.picked.v1');}
  unpick(id:string){return this.changeAllocation(id,'picked','allocated','inventory.unpicked.v1');}

  async release(id:string){
    const context=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};
    return this.tx.run(async trx=>{
      const a=await this.repo.allocation(trx,id,true);if(!a)throw new DomainError('ALLOCATION_NOT_FOUND','تخصیص پیدا نشد.');
      this.scopes.assert(context.actor,'warehouse',a.warehouse_id);if(a.status==='released')return{id,status:'released'};
      if(a.status==='shipped')throw new DomainError('INVALID_STATE_TRANSITION','تخصیص ارسال‌شده قابل آزادسازی نیست.');
      await this.repo.lockBalance(trx,a.warehouse_id,a.variant_id);
      if(a.reservation_id){const reservation=await this.repo.reservation(trx,a.reservation_id,true);if(reservation?.status==='converted'){await this.repo.updateBalance(trx,a.warehouse_id,a.variant_id,{allocated:-Number(a.quantity),reserved:Number(a.quantity)});await this.repo.subtractReservationAllocated(trx,a.reservation_id,a.warehouse_id,a.variant_id,Number(a.quantity));}else{await this.repo.updateBalance(trx,a.warehouse_id,a.variant_id,{allocated:-Number(a.quantity)});}}else{await this.repo.updateBalance(trx,a.warehouse_id,a.variant_id,{allocated:-Number(a.quantity)});}
      await this.repo.setAllocationStatus(trx,id,'released');
      await this.outbox.append(trx,[inventoryEvent('inventory.allocation.released.v1','allocation',id,Number(a.version)+1,{allocation_id:id,variant_id:a.variant_id,warehouse_id:a.warehouse_id,quantity:Number(a.quantity)})],context);
      return{id,status:'released'};
    });
  }

  private async changeAllocation(id:string,from:string,to:string,eventType:string){
    const context=this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};
    return this.tx.run(async trx=>{
      const a=await this.repo.allocation(trx,id,true);if(!a)throw new DomainError('ALLOCATION_NOT_FOUND','تخصیص پیدا نشد.');
      this.scopes.assert(context.actor,'warehouse',a.warehouse_id);if(a.status!==from)throw new DomainError('INVALID_STATE_TRANSITION','تغییر وضعیت تخصیص مجاز نیست.');
      await this.repo.setAllocationStatus(trx,id,to);
      await this.outbox.append(trx,[inventoryEvent(eventType,'allocation',id,Number(a.version)+1,{allocation_id:id,status:to})],context);
      return{id,status:to};
    });
  }

  async createTransfer(input:{source_warehouse_id:string;destination_warehouse_id:string;items:{variant_id:string;quantity:number}[]}){
    this.scopes.assert(this.ctx.get()?.actor,'warehouse',input.source_warehouse_id);this.scopes.assert(this.ctx.get()?.actor,'warehouse',input.destination_warehouse_id);
    if(input.source_warehouse_id===input.destination_warehouse_id)throw new DomainError('VALIDATION_ERROR','انبار مبدا و مقصد باید متفاوت باشند.');
    if(!input.items?.length)throw new DomainError('VALIDATION_ERROR','اقلام انتقال الزامی است.');
    if(new Set(input.items.map(x=>x.variant_id)).size!==input.items.length)throw new DomainError('DUPLICATE_TRANSFER_ITEM','هر واریانت فقط یک بار در انتقال مجاز است.');
    for(const x of input.items)if(!Number.isInteger(x.quantity)||x.quantity<=0)throw new DomainError('INVALID_QUANTITY','تعداد انتقال نامعتبر است.');
    const context=this.ctx.require(), id=randomUUID();
    await this.tx.run(async trx=>{
      await this.repo.createTransfer(trx,{id,sourceWarehouseId:input.source_warehouse_id,destinationWarehouseId:input.destination_warehouse_id,requestedBy:context.actor.id,items:input.items.map(x=>({id:randomUUID(),variantId:x.variant_id,quantity:x.quantity}))});
      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.transfer.create',resourceType:'transfer',resourceId:id,afterData:input,requestId:context.requestId,traceId:context.traceId});
    });
    return{id,status:'draft'};
  }

  async approve(id:string){
    const context=this.ctx.require();
    return this.tx.run(async trx=>{
      const t=await this.repo.transfer(trx,id,true);if(!t)throw new DomainError('TRANSFER_NOT_FOUND','انتقال پیدا نشد.');this.scopes.assert(context.actor,'warehouse',t.source_warehouse_id);this.scopes.assert(context.actor,'warehouse',t.destination_warehouse_id);if(t.status!=='draft')throw new DomainError('INVALID_STATE_TRANSITION','انتقال قابل تأیید نیست.');
      for(const x of t.items){const b=await this.repo.lockBalance(trx,t.source_warehouse_id,x.variant_id);const available=physicalAvailable({onHand:Number(b.on_hand),reserved:Number(b.reserved),allocated:Number(b.allocated),damaged:Number(b.damaged),quarantine:Number(b.quarantine)});if(available<Number(x.requested_quantity))throw new DomainError('INSUFFICIENT_STOCK','موجودی مبدا برای انتقال کافی نیست.');}
      await this.repo.setTransferStatus(trx,id,'approved',context.actor.id);
      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.transfer.approve',resourceType:'transfer',resourceId:id,requestId:context.requestId,traceId:context.traceId});
      return{id,status:'approved'};
    });
  }

  async ship(id:string){
    const context=this.ctx.require();
    return this.tx.run(async trx=>{
      const t=await this.repo.transfer(trx,id,true);if(!t)throw new DomainError('TRANSFER_NOT_FOUND','انتقال پیدا نشد.');this.scopes.assert(context.actor,'warehouse',t.source_warehouse_id);this.scopes.assert(context.actor,'warehouse',t.destination_warehouse_id);if(t.status!=='approved')throw new DomainError('INVALID_STATE_TRANSITION','انتقال قابل ارسال نیست.');
      for(const x of t.items){
        await this.repo.lockBalance(trx,t.source_warehouse_id,x.variant_id);
        let parts;try{parts=consumeFifo((await this.repo.fifoLayers(trx,t.source_warehouse_id,x.variant_id,'sellable')).map((l:any)=>({id:String(l.id),remainingQuantity:Number(l.remaining_quantity),effectiveUnitCostToman:Number(l.effective_unit_cost_toman),receivedAt:l.received_at})),Number(x.requested_quantity));}catch{throw new DomainError('INSUFFICIENT_COST_LAYERS','لایه هزینه کافی برای انتقال وجود ندارد.');}
        await this.repo.updateBalance(trx,t.source_warehouse_id,x.variant_id,{onHand:-Number(x.requested_quantity)});
        for(const p of parts){await this.repo.consumeLayer(trx,p.layerId,p.quantity);await this.repo.addTransferCostPart(trx,{id:randomUUID(),transferItemId:x.id,sourceCostLayerId:p.layerId,quantity:p.quantity,unitCostToman:p.unitCostToman});await this.repo.movement(trx,{id:randomUUID(),warehouseId:t.source_warehouse_id,variantId:x.variant_id,type:'transfer_out',quantityDelta:-p.quantity,costLayerId:p.layerId,transferId:id,createdBy:context.actor.id});}
        await this.repo.setTransferItemQuantities(trx,x.id,Number(x.requested_quantity));
      }
      await this.repo.setTransferStatus(trx,id,'shipped');
      await this.outbox.append(trx,[inventoryEvent('inventory.stock.transferred.v1','transfer',id,Number(t.version)+1,{transfer_id:id,status:'shipped',source_warehouse_id:t.source_warehouse_id,destination_warehouse_id:t.destination_warehouse_id})],context);
      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.transfer.ship',resourceType:'transfer',resourceId:id,requestId:context.requestId,traceId:context.traceId});
      return{id,status:'shipped'};
    });
  }

  async receive(id:string){
    const context=this.ctx.require();
    return this.tx.run(async trx=>{
      const t=await this.repo.transfer(trx,id,true);if(!t)throw new DomainError('TRANSFER_NOT_FOUND','انتقال پیدا نشد.');this.scopes.assert(context.actor,'warehouse',t.source_warehouse_id);this.scopes.assert(context.actor,'warehouse',t.destination_warehouse_id);if(t.status!=='shipped')throw new DomainError('INVALID_STATE_TRANSITION','انتقال قابل دریافت نیست.');
      for(const x of t.items){
        await this.repo.lockBalance(trx,t.destination_warehouse_id,x.variant_id);
        await this.repo.updateBalance(trx,t.destination_warehouse_id,x.variant_id,{onHand:Number(x.shipped_quantity)});
        for(const part of await this.repo.transferCostParts(trx,x.id)){
          if(part.destination_cost_layer_id)throw new DomainError('TRANSFER_ALREADY_RECEIVED','هزینه این انتقال قبلاً در مقصد ثبت شده است.');
          const layerId=randomUUID();
          await this.repo.createCostLayer(trx,{id:layerId,warehouseId:t.destination_warehouse_id,variantId:x.variant_id,quantity:Number(part.quantity),baseUnitCostToman:Number(part.unit_cost_toman),effectiveUnitCostToman:Number(part.unit_cost_toman),transferParentLayerId:part.source_cost_layer_id,stockBucket:'sellable'});
          await this.repo.setTransferDestinationLayer(trx,part.id,layerId);
          await this.repo.movement(trx,{id:randomUUID(),warehouseId:t.destination_warehouse_id,variantId:x.variant_id,type:'transfer_in',quantityDelta:Number(part.quantity),costLayerId:layerId,transferId:id,createdBy:context.actor.id});
        }
        await this.repo.setTransferItemQuantities(trx,x.id,Number(x.shipped_quantity),Number(x.shipped_quantity));
      }
      await this.repo.setTransferStatus(trx,id,'received');
      await this.outbox.append(trx,[inventoryEvent('inventory.stock.transferred.v1','transfer',id,Number(t.version)+1,{transfer_id:id,status:'received',source_warehouse_id:t.source_warehouse_id,destination_warehouse_id:t.destination_warehouse_id})],context);
      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.transfer.receive',resourceType:'transfer',resourceId:id,requestId:context.requestId,traceId:context.traceId});
      return{id,status:'received'};
    });
  }

  async cancel(id:string){
    const context=this.ctx.require();
    return this.tx.run(async trx=>{const t=await this.repo.transfer(trx,id,true);if(!t)throw new DomainError('TRANSFER_NOT_FOUND','انتقال پیدا نشد.');this.scopes.assert(context.actor,'warehouse',t.source_warehouse_id);this.scopes.assert(context.actor,'warehouse',t.destination_warehouse_id);if(!['draft','approved'].includes(t.status))throw new DomainError('INVALID_STATE_TRANSITION','انتقال ارسال‌شده قابل لغو ساده نیست.');await this.repo.setTransferStatus(trx,id,'cancelled');await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.transfer.cancel',resourceType:'transfer',resourceId:id,requestId:context.requestId,traceId:context.traceId});return{id,status:'cancelled'};});
  }
}
