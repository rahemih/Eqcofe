import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager, DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { ExecutionContext } from '../../../shared/application/execution-context';
import { DomainError } from '../../../shared/errors/domain-error';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { onlineSellable, physicalAvailable, consumeFifo } from '../domain/inventory.math';
import { inventoryEvent } from '../domain/inventory.events';
import { ScopePolicy } from '../../../platform/auth/scope-policy';

@Injectable()
export class InventoryService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly repo: InventoryRepository,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxWriter,
    private readonly ctx: RequestContextStore,
    private readonly scopes: ScopePolicy,
  ) {}

  warehouses(){ const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return this.repo.listWarehouses(allowed); }
  async list(variantId?:string){ const rows=await this.repo.listBalances(variantId);const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return rows.filter((row:any)=>allowed===null||allowed.includes(String(row.warehouse_id))).map((row:any)=>({...row,...this.availabilityFromRow(row)})); }
  async detail(variantId:string){return{variant_id:variantId,warehouses:await this.list(variantId),unit_cost_toman:(await this.costBasis(variantId)).unit_cost_toman};}
  reservations(status?:string){const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return this.repo.listReservations(status,allowed);}
  async reservation(id:string){const view=await this.repo.reservationView(id);if(!view)return null;const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');if(allowed!==null&&view.items.some((x:any)=>!allowed.includes(String(x.warehouse_id))))throw new DomainError('SCOPE_FORBIDDEN','این رزرو خارج از محدوده دسترسی انبار است.');return view;}
  costLayers(id:string){const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return this.repo.costLayers(id,allowed);}
  movements(id:string){ const allowed=this.scopes.allowedIds(this.ctx.get()?.actor,'warehouse');return this.repo.inventoryMovements(id,allowed); }
  async costBasis(id:string){ return {variant_id:id,unit_cost_toman:await this.repo.currentWeightedCost(id)}; }

  async createWarehouse(input:{code:string;name_fa:string;warehouse_type:string;physical_protection_percent?:number}){
    this.scopes.assertGlobal(this.ctx.get()?.actor,'warehouse');
    const id=randomUUID(); const context=this.requireStaffContext();
    await this.tx.run(async trx=>{
      await this.repo.createWarehouse(trx,{id,code:input.code,nameFa:input.name_fa,warehouseType:input.warehouse_type,protectionPercent:input.physical_protection_percent??20});
      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.warehouse.create',resourceType:'warehouse',resourceId:id,afterData:input,requestId:context.requestId,traceId:context.traceId});
    });
    return {id};
  }

  async setProtection(id:string,pct:number,expected:number){
    this.scopes.assert(this.ctx.get()?.actor,'warehouse',id);
    if(!Number.isFinite(pct)||pct<0||pct>100)throw new DomainError('VALIDATION_ERROR','درصد ذخیره حضوری باید بین صفر تا صد باشد.');
    const context=this.requireStaffContext();
    await this.tx.run(async trx=>{
      const before=await this.repo.warehouseForUpdate(trx,id); if(!before)throw new DomainError('WAREHOUSE_NOT_FOUND','انبار پیدا نشد.');
      await this.repo.updateWarehouseProtection(trx,id,pct,expected);
      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.warehouse.protection.update',resourceType:'warehouse',resourceId:id,beforeData:before,afterData:{physical_protection_percent:pct},requestId:context.requestId,traceId:context.traceId});
      await this.outbox.append(trx,[inventoryEvent('inventory.availability.changed.v1','warehouse',id,expected+1,{warehouse_id:id,reason:'physical_protection_changed'})],context);
    });
    return {id,physical_protection_percent:pct};
  }

  async adjust(input:{warehouse_id:string;variant_id:string;quantity_delta:number;adjustment_type:string;reason:string;unit_cost_toman?:number}){
    this.scopes.assert(this.ctx.get()?.actor,'warehouse',input.warehouse_id);
    if(!Number.isInteger(input.quantity_delta)||input.quantity_delta===0)throw new DomainError('INVALID_QUANTITY','تغییر موجودی باید عدد صحیح غیرصفر باشد.');
    const allowedAdjustments=new Set(['count_correction','receipt_adjustment','manual','damage','quarantine','quarantine_release','damaged_disposal']);
    if(!allowedAdjustments.has(String(input.adjustment_type)))throw new DomainError('INVALID_ADJUSTMENT_TYPE','نوع اصلاح موجودی معتبر نیست.');
    if(String(input.reason??'').trim().length<2)throw new DomainError('VALIDATION_ERROR','دلیل اصلاح موجودی الزامی است.');
    if(input.unit_cost_toman!=null&&(!Number.isSafeInteger(input.unit_cost_toman)||input.unit_cost_toman<0))throw new DomainError('INVALID_MONEY','بهای واحد باید عدد صحیح غیرمنفی به تومان باشد.');
    const context=this.requireStaffContext();
    return this.tx.run(async trx=>{
      const balance=await this.repo.lockBalance(trx,input.warehouse_id,input.variant_id); if(!balance)throw new DomainError('WAREHOUSE_NOT_FOUND','انبار پیدا نشد.');
      const q=input.quantity_delta;
      let movementIds:string[]=[];

      if(input.adjustment_type==='damage' || input.adjustment_type==='quarantine'){
        if(q<=0)throw new DomainError('INVALID_QUANTITY','تغییر وضعیت کالا باید مقدار مثبت داشته باشد.');
        const free=physicalAvailable(this.balanceMath(balance)); if(free<q)throw new DomainError('INSUFFICIENT_STOCK','موجودی آزاد کافی نیست.');
        const bucket=input.adjustment_type==='damage'?'damaged':'quarantine';
        const parts=await this.moveCostBucket(trx,input.warehouse_id,input.variant_id,'sellable',bucket,q);
        await this.repo.updateBalance(trx,input.warehouse_id,input.variant_id,bucket==='damaged'?{damaged:q}:{quarantine:q});
        for(const p of parts){const id=randomUUID();movementIds.push(id);await this.repo.movement(trx,{id,warehouseId:input.warehouse_id,variantId:input.variant_id,type:input.adjustment_type,quantityDelta:0,bucketFrom:'sellable',bucketTo:bucket,costLayerId:p.destinationLayerId,reasonCode:input.adjustment_type,createdBy:context.actor.id});}
      } else if(input.adjustment_type==='quarantine_release'){
        if(q<=0||Number(balance.quarantine)<q)throw new DomainError('INVALID_QUANTITY','مقدار آزادسازی قرنطینه نامعتبر است.');
        const parts=await this.moveCostBucket(trx,input.warehouse_id,input.variant_id,'quarantine','sellable',q);
        await this.repo.updateBalance(trx,input.warehouse_id,input.variant_id,{quarantine:-q});
        for(const p of parts){const id=randomUUID();movementIds.push(id);await this.repo.movement(trx,{id,warehouseId:input.warehouse_id,variantId:input.variant_id,type:'quarantine_release',quantityDelta:0,bucketFrom:'quarantine',bucketTo:'sellable',costLayerId:p.destinationLayerId,reasonCode:'quarantine_release',createdBy:context.actor.id});}
      } else if(input.adjustment_type==='damaged_disposal'){
        if(q<=0||Number(balance.damaged)<q)throw new DomainError('INVALID_QUANTITY','مقدار امحای کالای آسیب‌دیده نامعتبر است.');
        const parts=this.consumeParts(await this.repo.fifoLayers(trx,input.warehouse_id,input.variant_id,'damaged'),q);
        for(const p of parts){await this.repo.consumeLayer(trx,p.layerId,p.quantity);const id=randomUUID();movementIds.push(id);await this.repo.movement(trx,{id,warehouseId:input.warehouse_id,variantId:input.variant_id,type:'damaged_disposal',quantityDelta:-p.quantity,costLayerId:p.layerId,reasonCode:'damaged_disposal',createdBy:context.actor.id});}
        await this.repo.updateBalance(trx,input.warehouse_id,input.variant_id,{onHand:-q,damaged:-q});
      } else {
        const next=Number(balance.on_hand)+q;
        const encumbered=Number(balance.reserved)+Number(balance.allocated)+Number(balance.damaged)+Number(balance.quarantine);
        if(next<encumbered)throw new DomainError('INSUFFICIENT_STOCK','اصلاح شمارش نمی‌تواند موجودی را کمتر از اقلام رزرو/تخصیص/قرنطینه/آسیب‌دیده کند.');
        if(q>0 && input.unit_cost_toman==null)throw new DomainError('COST_BASIS_REQUIRED','برای افزایش موجودی، بهای واحد به تومان الزامی است.');
        if(q<0){
          const layers=await this.repo.fifoLayers(trx,input.warehouse_id,input.variant_id,'sellable');
          const parts=this.consumeParts(layers,-q);
          for(const part of parts){await this.repo.consumeLayer(trx,part.layerId,part.quantity);const id=randomUUID();movementIds.push(id);await this.repo.movement(trx,{id,warehouseId:input.warehouse_id,variantId:input.variant_id,type:input.adjustment_type,quantityDelta:-part.quantity,costLayerId:part.layerId,reasonCode:input.adjustment_type,createdBy:context.actor.id});}
        } else {
          const layerId=randomUUID(); await this.repo.createCostLayer(trx,{id:layerId,warehouseId:input.warehouse_id,variantId:input.variant_id,quantity:q,baseUnitCostToman:input.unit_cost_toman,stockBucket:'sellable'});
          const id=randomUUID();movementIds.push(id);await this.repo.movement(trx,{id,warehouseId:input.warehouse_id,variantId:input.variant_id,type:input.adjustment_type,quantityDelta:q,costLayerId:layerId,reasonCode:input.adjustment_type,createdBy:context.actor.id});
        }
        await this.repo.updateBalance(trx,input.warehouse_id,input.variant_id,{onHand:q});
      }

      await this.audit.writeWith(trx,{actorType:context.actor.type,actorId:context.actor.id,action:'inventory.adjust',resourceType:'variant',resourceId:input.variant_id,reason:input.reason,afterData:input,requestId:context.requestId,traceId:context.traceId});
      await this.outbox.append(trx,[inventoryEvent('inventory.stock.adjusted.v1','variant',input.variant_id,Number(balance.version)+1,{warehouse_id:input.warehouse_id,variant_id:input.variant_id,adjustment_type:input.adjustment_type,quantity:Math.abs(q)}),inventoryEvent('inventory.availability.changed.v1','variant',input.variant_id,Number(balance.version)+1,{warehouse_id:input.warehouse_id,variant_id:input.variant_id})],context);
      return {movement_ids:movementIds};
    });
  }

  async reserve(input:{cart_id?:string;order_id?:string;customer_id?:string;expires_at:string;payment_grace_until?:string;items:{warehouse_id:string;variant_id:string;quantity:number}[]}){
    return this.tx.run(trx=>this.reserveInTransaction(trx,input));
  }

  async reserveInTransaction(trx:DatabaseExecutor,input:{cart_id?:string;order_id?:string;customer_id?:string;expires_at:string;payment_grace_until?:string;items:{warehouse_id:string;variant_id:string;quantity:number}[]}){
    if(!input.items?.length)throw new DomainError('VALIDATION_ERROR','حداقل یک قلم برای رزرو الزامی است.');
    const expiresAt=new Date(input.expires_at);const grace=input.payment_grace_until?new Date(input.payment_grace_until):null;
    if(Number.isNaN(expiresAt.getTime())||expiresAt<=new Date())throw new DomainError('INVALID_RESERVATION_EXPIRY','زمان انقضای رزرو باید معتبر و در آینده باشد.');
    if(grace&&(Number.isNaN(grace.getTime())||grace<expiresAt))throw new DomainError('INVALID_PAYMENT_GRACE','مهلت پرداخت باید بعد از انقضای اولیه رزرو باشد.');
    const duplicateKeys=input.items.map(x=>`${x.warehouse_id}:${x.variant_id}`);if(new Set(duplicateKeys).size!==duplicateKeys.length)throw new DomainError('DUPLICATE_RESERVATION_ITEM','یک واریانت در یک انبار نباید دوبار در رزرو تکرار شود.');
    const id=randomUUID(), context=this.contextOrSystem();
    const items=[...input.items].sort((a,b)=>(a.warehouse_id+a.variant_id).localeCompare(b.warehouse_id+b.variant_id));
    for(const x of items){this.scopes.assert(context.actor,'warehouse',x.warehouse_id);if(!Number.isInteger(x.quantity)||x.quantity<=0)throw new DomainError('INVALID_QUANTITY','تعداد رزرو نامعتبر است.');const b=await this.repo.lockBalance(trx,x.warehouse_id,x.variant_id);const sellable=onlineSellable({...this.balanceMath(b),protectionPercent:Number(b.physical_protection_percent)});if(sellable<x.quantity)throw new DomainError('INSUFFICIENT_STOCK','موجودی قابل فروش آنلاین کافی نیست.',{variant_id:x.variant_id,available:sellable});}
    await this.repo.insertReservation(trx,{id,cartId:input.cart_id,orderId:input.order_id,customerId:input.customer_id,expiresAt,paymentGraceUntil:grace,items:items.map(x=>({id:randomUUID(),warehouseId:x.warehouse_id,variantId:x.variant_id,quantity:x.quantity}))});
    for(const x of items)await this.repo.updateBalance(trx,x.warehouse_id,x.variant_id,{reserved:x.quantity});
    await this.outbox.append(trx,[inventoryEvent('inventory.reservation.created.v1','reservation',id,1,{reservation_id:id,cart_id:input.cart_id??null,order_id:input.order_id??null,items})],context);
    return {id,status:'active'};
  }

  async attachOrderInTransaction(ex:DatabaseExecutor,reservationId:string,orderId:string,paymentGraceUntil:string){const grace=new Date(paymentGraceUntil);if(Number.isNaN(grace.getTime())||grace<=new Date())throw new DomainError('INVALID_PAYMENT_GRACE','مهلت پرداخت سفارش معتبر نیست.');const ok=await this.repo.attachReservationOrder(ex,reservationId,orderId,paymentGraceUntil);if(!ok)throw new DomainError('RESERVATION_NOT_ATTACHABLE','رزرو منقضی، آزادشده یا قبلاً متصل شده است.');return{reservation_id:reservationId,order_id:orderId};}

  async release(id:string,target:'released'|'expired'|'cancelled'='released'){return this.tx.run(trx=>this.releaseInTransaction(trx,id,target));}
  async releaseInTransaction(trx:DatabaseExecutor,id:string,target:'released'|'expired'|'cancelled'='released'){
    const context=this.contextOrSystem();const r=await this.repo.reservation(trx,id,true); if(!r)throw new DomainError('RESERVATION_NOT_FOUND','رزرو پیدا نشد.');
    if(!['active','payment_pending','late_payment_review'].includes(r.status))return{id,status:r.status};
    for(const x of await this.repo.reservationItems(trx,id)){const commitment=Number(x.quantity)-Number(x.allocated_quantity??0)-Number(x.released_quantity??0);if(commitment<=0)continue;const balance=await this.repo.lockBalance(trx,x.warehouse_id,x.variant_id);if(Number(balance.reserved)<commitment)throw new DomainError('RESERVATION_RELEASE_CONFLICT','مانده رزرو با Stock Balance سازگار نیست.');await this.repo.updateBalance(trx,x.warehouse_id,x.variant_id,{reserved:-commitment});await this.repo.releaseReservationRemainder(trx,x.id,commitment);}
    await this.repo.setReservationStatus(trx,id,target);const eventType=target==='expired'?'inventory.reservation.expired.v1':'inventory.reservation.released.v1';await this.outbox.append(trx,[inventoryEvent(eventType,'reservation',id,Number(r.version)+1,{reservation_id:id,status:target})],context);return{id,status:target};
  }

  async beginPayment(id:string){
    const context=this.contextOrSystem();
    return this.tx.run(async trx=>{const r=await this.repo.reservation(trx,id,true);if(!r)throw new DomainError('RESERVATION_NOT_FOUND','رزرو پیدا نشد.');if(r.status!=='active')throw new DomainError('INVALID_STATE_TRANSITION','رزرو در وضعیت مناسب نیست.');await this.repo.setReservationStatus(trx,id,'payment_pending');await this.outbox.append(trx,[inventoryEvent('inventory.reservation.payment_pending.v1','reservation',id,Number(r.version)+1,{reservation_id:id})],context);return{id,status:'payment_pending'};});
  }

  async releaseConvertedCommitment(id:string){
    const context=this.contextOrSystem();
    return this.tx.run(async trx=>{
      const reservation=await this.repo.reservation(trx,id,true);if(!reservation)throw new DomainError('RESERVATION_NOT_FOUND','رزرو پیدا نشد.');if(reservation.status!=='converted')throw new DomainError('INVALID_STATE_TRANSITION','فقط تعهد رزرو تبدیل‌شده قابل آزادسازی است.');
      let released=0;
      for(const item of await this.repo.reservationItems(trx,id)){const remaining=Number(item.quantity)-Number(item.allocated_quantity)-Number(item.released_quantity??0);if(remaining<=0)continue;const balance=await this.repo.lockBalance(trx,item.warehouse_id,item.variant_id);if(Number(balance.reserved)<remaining)throw new DomainError('RESERVATION_RELEASE_CONFLICT','مانده رزرو با Stock Balance سازگار نیست.');await this.repo.updateBalance(trx,item.warehouse_id,item.variant_id,{reserved:-remaining});await this.repo.releaseReservationRemainder(trx,item.id,remaining);released+=remaining;}
      await this.outbox.append(trx,[inventoryEvent('inventory.reservation.commitment_released.v1','reservation',id,Number(reservation.version),{reservation_id:id,released_quantity:released})],context);
      return{id,status:'converted',released_quantity:released};
    });
  }

  async markLatePaymentReview(id:string){
    const context=this.contextOrSystem();
    return this.tx.run(async trx=>{const r=await this.repo.reservation(trx,id,true);if(!r)throw new DomainError('RESERVATION_NOT_FOUND','رزرو پیدا نشد.');if(r.status==='late_payment_review')return{id,status:'late_payment_review'};if(r.status!=='expired')throw new DomainError('INVALID_STATE_TRANSITION','فقط رزرو منقضی وارد بررسی پرداخت دیرهنگام می‌شود.');await this.repo.setReservationStatus(trx,id,'late_payment_review');await this.outbox.append(trx,[inventoryEvent('inventory.reservation.late_review_required.v1','reservation',id,Number(r.version)+1,{reservation_id:id})],context);return{id,status:'late_payment_review'};});
  }

  async convert(id:string){
    const context=this.contextOrSystem();
    return this.tx.run(async trx=>{
      const r=await this.repo.reservation(trx,id,true);if(!r)throw new DomainError('RESERVATION_NOT_FOUND','رزرو پیدا نشد.');
      if(r.status==='converted')return{id,status:'converted'};if(!['active','payment_pending','late_payment_review'].includes(r.status))throw new DomainError('RESERVATION_NOT_CONVERTIBLE','رزرو قابل تبدیل نیست.');
      const items=await this.repo.reservationItems(trx,id);
      if(r.status==='late_payment_review'){
        // Expiry already released the original commitment. Re-acquire stock atomically before conversion.
        for(const x of items){
          const released=Number(x.released_quantity??0); if(released<=0)continue;
          const b=await this.repo.lockBalance(trx,x.warehouse_id,x.variant_id);
          const sellable=onlineSellable({...this.balanceMath(b),protectionPercent:Number(b.physical_protection_percent)});
          if(sellable<released)throw new DomainError('LATE_PAYMENT_STOCK_UNAVAILABLE','پس از پرداخت دیرهنگام موجودی کافی برای بازپس‌گیری رزرو وجود ندارد.',{variant_id:x.variant_id,available:sellable,required:released});
          await this.repo.updateBalance(trx,x.warehouse_id,x.variant_id,{reserved:released});
          await this.repo.reclaimReservationReleased(trx,x.id,released);
        }
      }
      for(const x of items){
        const commitment=Number(x.quantity)-Number(x.allocated_quantity??0)-Number(x.released_quantity??0);
        if(commitment<=0)continue;
        const b=await this.repo.lockBalance(trx,x.warehouse_id,x.variant_id);
        if(Number(b.reserved)<commitment)throw new DomainError('RESERVATION_NOT_CONVERTIBLE','موجودی رزروشده کافی نیست.');
      }
      await this.repo.setReservationStatus(trx,id,'converted');
      await this.outbox.append(trx,[inventoryEvent('inventory.reservation.converted.v1','reservation',id,Number(r.version)+1,{reservation_id:id,order_id:r.order_id??null,late_payment:r.status==='late_payment_review'})],context);
      return{id,status:'converted'};
    });
  }

  async expireDue(limit=100){
    const ids=await this.repo.expiredReservationIds(limit); const results=[];
    for(const id of ids){try{results.push(await this.release(id,'expired'));}catch(error){results.push({id,status:'failed',error:error instanceof Error?error.message:'unknown'});}}
    return results;
  }

  async consumeForSale(input:{allocation_id:string}){
    const context=this.contextOrSystem();
    return this.tx.run(async trx=>{
      const allocation=await this.repo.allocation(trx,input.allocation_id,true);
      if(!allocation)throw new DomainError('ALLOCATION_NOT_FOUND','تخصیص پیدا نشد.');
      this.scopes.assert(context.actor,'warehouse',allocation.warehouse_id);
      if(allocation.status!=='picked')throw new DomainError('INVALID_STATE_TRANSITION','فقط تخصیص Pick شده قابل خروج از انبار است.');
      const quantity=Number(allocation.quantity);
      const b=await this.repo.lockBalance(trx,allocation.warehouse_id,allocation.variant_id);if(Number(b.allocated)<quantity)throw new DomainError('INSUFFICIENT_ALLOCATION','تخصیص موجودی کافی نیست.');
      const parts=this.consumeParts(await this.repo.fifoLayers(trx,allocation.warehouse_id,allocation.variant_id,'sellable'),quantity);
      await this.repo.updateBalance(trx,allocation.warehouse_id,allocation.variant_id,{onHand:-quantity,allocated:-quantity});
      const movementIds=[] as string[];
      for(const p of parts){await this.repo.consumeLayer(trx,p.layerId,p.quantity);const mid=randomUUID();movementIds.push(mid);await this.repo.movement(trx,{id:mid,warehouseId:allocation.warehouse_id,variantId:allocation.variant_id,type:'sale',quantityDelta:-p.quantity,costLayerId:p.layerId,allocationId:allocation.id});await this.repo.insertCostConsumption(trx,{id:randomUUID(),costLayerId:p.layerId,orderItemId:allocation.order_item_id,movementId:mid,quantity:p.quantity,unitCostToman:p.unitCostToman});}
      await this.repo.setAllocationStatus(trx,allocation.id,'shipped');
      const total=parts.reduce((sum,p)=>sum+p.quantity*p.unitCostToman,0);
      await this.outbox.append(trx,[inventoryEvent('inventory.stock.consumed.v1','allocation',allocation.id,Number(allocation.version)+1,{allocation_id:allocation.id,warehouse_id:allocation.warehouse_id,variant_id:allocation.variant_id,order_item_id:allocation.order_item_id,quantity,total_cost_toman:total}),inventoryEvent('inventory.availability.changed.v1','variant',allocation.variant_id,Number(b.version)+1,{warehouse_id:allocation.warehouse_id,variant_id:allocation.variant_id})],context);
      return{allocation_id:allocation.id,parts,total_cost_toman:total,movement_ids:movementIds,status:'shipped'};
    });
  }

  availabilityFromRow(b:any){const common={...this.balanceMath(b),protectionPercent:Number(b.physical_protection_percent)};return{physical_available:physicalAvailable(common),online_sellable:onlineSellable(common)};}

  private balanceMath(b:any){return{onHand:Number(b.on_hand),reserved:Number(b.reserved),allocated:Number(b.allocated),damaged:Number(b.damaged),quarantine:Number(b.quarantine)};}
  private consumeParts(layers:any[],quantity:number){try{return consumeFifo(layers.map((x:any)=>({id:String(x.id),remainingQuantity:Number(x.remaining_quantity),effectiveUnitCostToman:Number(x.effective_unit_cost_toman),receivedAt:x.received_at})),quantity);}catch{throw new DomainError('INSUFFICIENT_COST_LAYERS','لایه هزینه کافی وجود ندارد.');}}
  private async moveCostBucket(trx:any,warehouseId:string,variantId:string,from:string,to:string,quantity:number){const layers=await this.repo.fifoLayers(trx,warehouseId,variantId,from);const parts=this.consumeParts(layers,quantity);const out=[] as {sourceLayerId:string;destinationLayerId:string;quantity:number;unitCostToman:number}[];for(const p of parts){await this.repo.consumeLayer(trx,p.layerId,p.quantity);const destinationLayerId=randomUUID();await this.repo.createCostLayer(trx,{id:destinationLayerId,warehouseId,variantId,quantity:p.quantity,baseUnitCostToman:p.unitCostToman,effectiveUnitCostToman:p.unitCostToman,stockBucket:to,conditionParentLayerId:p.layerId});out.push({sourceLayerId:p.layerId,destinationLayerId,quantity:p.quantity,unitCostToman:p.unitCostToman});}return out;}
  private contextOrSystem():ExecutionContext{return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system'}};}
  private requireStaffContext(){return this.ctx.require();}
}
