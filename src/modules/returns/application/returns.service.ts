import { Inject,Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { ORDER_RETURNS_PORT,OrderReturnsPort } from '../../orders/application/ports/order-returns.port';
import { ReturnsRepository } from '../infrastructure/returns.repository';
import { returnEvent } from '../domain/return.events';
import { AfterSalesIntegrationService } from '../../after-sales/application/after-sales-integration.service';

type CreateItem={order_item_id:string;quantity:number;reason_code:string;note?:string|null};
@Injectable()
export class ReturnsService{
  constructor(
    private readonly tx:TransactionManager,private readonly repo:ReturnsRepository,
    private readonly outbox:OutboxWriter,private readonly ctx:RequestContextStore,
    @Inject(ORDER_RETURNS_PORT) private readonly orders:OrderReturnsPort,
    private readonly afterSales:AfterSalesIntegrationService,
  ){}
  private customerId(){const a=this.ctx.get()?.actor;if(a?.type!=='customer'||!a.id)throw new DomainError('CUSTOMER_REQUIRED','ورود مشتری الزامی است.');return a.id;}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private actor(){const a=this.ctx.get()?.actor;return{type:a?.type??'system',id:a?.id??null};}
  private number(){return `RET-${randomUUID().replaceAll('-','').toUpperCase()}`;}
  private cleanText(v:unknown,max:number,required=false){const x=v==null?'':String(v).trim();if((required&&!x)||x.length>max)throw new DomainError('VALIDATION_ERROR','متن ورودی معتبر نیست.');return x||null;}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}

  async createCustomer(orderNumber:string,input:{items:CreateItem[]}){
    const customerId=this.customerId(),items=input?.items;
    if(!Array.isArray(items)||items.length<1||items.length>100)throw new DomainError('RETURN_ITEMS_REQUIRED','حداقل یک قلم مرجوعی الزامی است.');
    const normalized=items.map(x=>({orderItemId:this.uuid(x.order_item_id),quantity:Number(x.quantity),reasonCode:this.cleanText(x.reason_code,100,true)!,note:this.cleanText(x.note,1000,false)}));
    const seen=new Set<string>();for(const x of normalized){if(seen.has(x.orderItemId))throw new DomainError('RETURN_DUPLICATE_ORDER_ITEM','قلم سفارش در درخواست مرجوعی تکراری است.');seen.add(x.orderItemId);if(!Number.isInteger(x.quantity)||x.quantity<=0)throw new DomainError('INVALID_QUANTITY','تعداد مرجوعی معتبر نیست.');}
    const ctx=this.context();
    return this.tx.run(async ex=>{
      const order=await this.orders.getOwnedForReturn(ex,orderNumber,customerId,true);if(!order)throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');
      if(!['confirmed','completed'].includes(order.status))throw new DomainError('RETURN_ORDER_NOT_ELIGIBLE','سفارش در وضعیت قابل مرجوعی نیست.');
      const byId=new Map(order.items.map(x=>[x.id,x]));for(const x of normalized){const oi=byId.get(x.orderItemId);if(!oi)throw new DomainError('RETURN_ORDER_ITEM_INVALID','قلم سفارش متعلق به این سفارش نیست.');if(x.quantity>oi.quantity)throw new DomainError('RETURN_QUANTITY_EXCEEDS_ORDER_ITEM','تعداد مرجوعی از تعداد سفارش بیشتر است.');}
      const id=randomUUID(),number=this.number();const h=await this.repo.createHeader(ex,{id,number,orderId:order.id,customerId});
      for(const x of normalized)await this.repo.createItem(ex,{id:randomUUID(),returnId:id,orderItemId:x.orderItemId,quantity:x.quantity,reasonCode:x.reasonCode,note:x.note});
      const actor=this.actor();await this.repo.history(ex,id,null,'requested',null,actor.type,actor.id);
      await this.outbox.append(ex,[returnEvent('return.requested.v1',id,1,{return_id:id,return_number:number,order_id:order.id,customer_id:customerId,items:normalized.map(x=>({order_item_id:x.orderItemId,quantity:x.quantity,reason_code:x.reasonCode,note:x.note}))})],ctx);
      return this.repo.view(ex,id);
    });
  }

  async listCustomer(){return this.repo.listCustomer(this.customerId());}
  async getCustomer(number:string){const r=await this.repo.byNumber(this.repo.db(),number,this.customerId(),false);if(!r)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');return this.repo.view(this.repo.db(),String(r.id));}
  async timelineCustomer(number:string){
    const r=await this.repo.byNumber(this.repo.db(),number,this.customerId(),false);
    if(!r)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');
    return{return_number:number,timeline:await this.repo.timeline(this.repo.db(),String(r.id))};
  }
  async listAdmin(){return this.repo.listAdmin();}
  async getAdmin(id:string){const x=await this.repo.view(this.repo.db(),this.uuid(id));if(!x)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');return x;}
  async timelineAdmin(id:string){
    const h=await this.repo.byId(this.repo.db(),this.uuid(id),false);
    if(!h)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');
    return{return_id:String(h.id),timeline:await this.repo.timeline(this.repo.db(),String(h.id))};
  }

  async cancelCustomer(number:string,reasonInput:string){
    const customerId=this.customerId(),reason=this.cleanText(reasonInput,2000,true)!,ctx=this.context();
    return this.tx.run(async ex=>{
      const h=await this.repo.byNumber(ex,number,customerId,true);if(!h)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');
      if(h.status!=='requested')throw new DomainError('RETURN_CUSTOMER_CANCEL_NOT_ALLOWED','مشتری فقط پیش از شروع بررسی می‌تواند درخواست مرجوعی را لغو کند.');
      const next=await this.repo.transition(ex,String(h.id),'cancelled',{reason});await this.repo.setAllItemStatus(ex,String(h.id),'cancelled');
      const actor=this.actor();await this.repo.history(ex,String(h.id),String(h.status),'cancelled',reason,actor.type,actor.id);
      await this.outbox.append(ex,[returnEvent('return.cancelled.v1',String(h.id),Number(next.version),{return_id:String(h.id),return_number:String(h.return_number),order_id:String(h.order_id),reason})],ctx);
      return this.repo.view(ex,String(h.id));
    });
  }

  async startReview(id:string,comment?:string|null){return this.simpleAdminTransition(id,'requested','under_review','return.review_started.v1',{comment:this.cleanText(comment,2000,false)});}
  async approve(id:string,comment?:string|null){return this.simpleAdminTransition(id,'under_review','approved','return.approved.v1',{comment:this.cleanText(comment,2000,false)},'approved');}
  async reject(id:string,reasonInput?:string|null){
    const reason=this.cleanText(reasonInput,2000,true)!;return this.simpleAdminTransition(id,'under_review','rejected','return.rejected.v1',{reason},'rejected');
  }

  async receive(id:string,input:{received_at?:string|null;items:{return_item_id:string;received_quantity:number}[];note?:string|null}){
    const receivedAt=input?.received_at==null?null:new Date(String(input.received_at));if(receivedAt&&Number.isNaN(receivedAt.getTime()))throw new DomainError('VALIDATION_ERROR','زمان دریافت معتبر نیست.');
    if(receivedAt&&receivedAt.getTime()>Date.now()+5*60_000)throw new DomainError('RETURN_RECEIVED_AT_INVALID','زمان دریافت نمی‌تواند در آینده باشد.');
    if(!Array.isArray(input?.items)||input.items.length<1)throw new DomainError('RETURN_RECEIVE_ITEMS_REQUIRED','حداقل یک قلم دریافت الزامی است.');
    const items=input.items.map(x=>({returnItemId:this.uuid(x.return_item_id),receivedQuantity:Number(x.received_quantity)}));const seen=new Set<string>();
    for(const x of items){if(seen.has(x.returnItemId))throw new DomainError('RETURN_RECEIVE_ITEM_DUPLICATE','قلم دریافت تکراری است.');seen.add(x.returnItemId);if(!Number.isInteger(x.receivedQuantity)||x.receivedQuantity<0)throw new DomainError('INVALID_QUANTITY','تعداد دریافت معتبر نیست.');}
    const note=this.cleanText(input.note,2000,false),ctx=this.context();
    return this.tx.run(async ex=>{
      const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');if(!['approved','in_transit_to_store'].includes(String(h.status)))throw new DomainError('INVALID_STATE_TRANSITION','مرجوعی در وضعیت قابل دریافت نیست.');
      await this.repo.receiveItems(ex,String(h.id),items);
      const all=await this.repo.items(ex,String(h.id),true);if(all.some((x:any)=>Number(x.received_quantity)<=0))throw new DomainError('RETURN_RECEIPT_INCOMPLETE','برای ورود به وضعیت دریافت‌شده، همه اقلام باید دریافت شده باشند.');
      const next=await this.repo.transition(ex,String(h.id),'received',{receivedAt,comment:note});const actor=this.actor();await this.repo.history(ex,String(h.id),String(h.status),'received',note,actor.type,actor.id);
      await this.outbox.append(ex,[returnEvent('return.received.v1',String(h.id),Number(next.version),{return_id:String(h.id),return_number:String(h.return_number),order_id:String(h.order_id),received_at:next.received_at,items:all.map((x:any)=>({return_item_id:String(x.id),received_quantity:Number(x.received_quantity)})),note})],ctx);
      return this.repo.view(ex,String(h.id));
    });
  }

  async startInspection(id:string,comment?:string|null){return this.simpleAdminTransition(id,'received','inspecting','return.inspection_started.v1',{comment:this.cleanText(comment,2000,false)},'inspecting');}

  async resolve(id:string,input:{resolution_note:string;items:{return_item_id:string;resolution:'refund'|'replacement'|'repair'|'no_action';disposition:'restock_sellable'|'restock_quarantine'|'damaged'|'repair'|'replace'|'refund'|'no_action';refund_amount_toman?:number|null;warehouse_id?:string|null}[]}){
    const resolutionNote=this.cleanText(input?.resolution_note,4000,true)!;
    if(!Array.isArray(input?.items)||input.items.length<1)throw new DomainError('RETURN_RESOLUTION_ITEMS_REQUIRED','تعیین تکلیف همه اقلام مرجوعی الزامی است.');
    const normalized=input.items.map(x=>({
      returnItemId:this.uuid(x.return_item_id),resolution:String(x.resolution),disposition:String(x.disposition),
      refundAmount:x.refund_amount_toman==null?null:Number(x.refund_amount_toman),
      warehouseId:x.warehouse_id==null?null:this.uuid(x.warehouse_id)
    }));
    const seen=new Set<string>();
    for(const x of normalized){
      if(seen.has(x.returnItemId))throw new DomainError('RETURN_RESOLUTION_ITEM_DUPLICATE','قلم مرجوعی در تعیین تکلیف تکراری است.');seen.add(x.returnItemId);
      if(!['refund','replacement','repair','no_action'].includes(x.resolution))throw new DomainError('RETURN_RESOLUTION_INVALID','نوع تعیین تکلیف معتبر نیست.');
      if(!['restock_sellable','restock_quarantine','damaged','repair','replace','refund','no_action'].includes(x.disposition))throw new DomainError('RETURN_DISPOSITION_INVALID','وضعیت نهایی کالا معتبر نیست.');
      if(x.resolution==='refund'&&(!Number.isSafeInteger(x.refundAmount)||Number(x.refundAmount)<=0))throw new DomainError('RETURN_REFUND_AMOUNT_REQUIRED','مبلغ بازپرداخت برای قلم الزامی است.');
      if(x.resolution!=='refund'&&x.refundAmount!=null)throw new DomainError('RETURN_REFUND_AMOUNT_UNEXPECTED','مبلغ بازپرداخت فقط برای resolution بازپرداخت مجاز است.');
      if(['restock_sellable','restock_quarantine','damaged'].includes(x.disposition)&&!x.warehouseId)throw new DomainError('RETURN_WAREHOUSE_REQUIRED','انبار مقصد برای بازگشت موجودی الزامی است.');
    }
    const ctx=this.context();
    return this.tx.run(async ex=>{
      const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');
      if(String(h.status)!=='inspecting')throw new DomainError('INVALID_STATE_TRANSITION','فقط مرجوعی در حال بازرسی قابل تعیین تکلیف است.');
      const items=await this.repo.items(ex,String(h.id),true);
      if(items.length!==normalized.length||items.some((r:any)=>!seen.has(String(r.id))))throw new DomainError('RETURN_RESOLUTION_INCOMPLETE','برای تمام اقلام مرجوعی باید تعیین تکلیف ثبت شود.');

      const results:any[]=[];
      for(const action of normalized.sort((a,b)=>a.returnItemId.localeCompare(b.returnItemId))){
        const ri=items.find((x:any)=>String(x.id)===action.returnItemId)!;
        const qty=Number(ri.received_quantity);
        if(!Number.isInteger(qty)||qty<=0)throw new DomainError('RETURN_RECEIVED_QUANTITY_REQUIRED','تعداد دریافت‌شده قلم برای تعیین تکلیف معتبر نیست.');
        const orderItem=await this.afterSales.orderItem(ex,String(h.order_id),String(ri.order_item_id),true);
        const delivery=await this.afterSales.fulfillment.deliveredItem(ex,String(h.order_id),String(ri.order_item_id),true);
        if(qty>delivery.deliveredQuantity)throw new DomainError('RETURN_QUANTITY_EXCEEDS_DELIVERED','تعداد تعیین تکلیف از مقدار تحویل‌شده بیشتر است.');

        let refundId:string|null=null,replacementRequestId:string|null=null,inventoryMovementId:string|null=null;
        if(action.resolution==='refund'){
          const max=this.afterSales.maxRefundForQuantity(orderItem,qty);
          if(Number(action.refundAmount)>max)throw new DomainError('RETURN_REFUND_LINE_CAP_EXCEEDED','مبلغ بازپرداخت از ارزش قلم مرجوعی بیشتر است.',{max_refund_toman:max});
          const refund=await this.afterSales.payments.requestRefundInTransaction(ex,{orderId:String(h.order_id),amountToman:Number(action.refundAmount),reasonCode:'return_resolution'});
          refundId=refund.refundId;
        }
        if(action.resolution==='replacement'){
          const rep=await this.afterSales.requestReplacementInTransaction(ex,{sourceType:'return_item',sourceId:String(ri.id),orderId:String(h.order_id),orderItemId:String(ri.order_item_id),customerId:String(h.customer_id),variantId:orderItem.variantId,quantity:qty,note:resolutionNote});
          replacementRequestId=String(rep.id);
        }
        if(['restock_sellable','restock_quarantine','damaged'].includes(action.disposition)){
          const bucket=action.disposition==='restock_sellable'?'sellable':action.disposition==='restock_quarantine'?'quarantine':'damaged';
          const inv=await this.afterSales.inventory.receiveReturnInTransaction(ex,{returnItemId:String(ri.id),orderItemId:String(ri.order_item_id),warehouseId:action.warehouseId!,variantId:orderItem.variantId,quantity:qty,bucket,reasonCode:'after_sales_resolution'});
          inventoryMovementId=inv.movementIds[0]??null;
        }
        const updated=await this.repo.resolveItem(ex,{returnItemId:String(ri.id),resolution:action.resolution,disposition:action.disposition,refundId,replacementRequestId,inventoryMovementId});
        results.push({return_item_id:String(updated.id),resolution:action.resolution,disposition:action.disposition,refund_id:refundId,replacement_request_id:replacementRequestId,inventory_movement_id:inventoryMovementId});
      }
      const next=await this.repo.transition(ex,String(h.id),'resolved',{resolutionNote});
      const actor=this.actor();await this.repo.history(ex,String(h.id),String(h.status),'resolved',resolutionNote,actor.type,actor.id);
      await this.outbox.append(ex,[returnEvent('return.resolved.v1',String(h.id),Number(next.version),{return_id:String(h.id),return_number:String(h.return_number),order_id:String(h.order_id),resolution_note:resolutionNote,items:results})],ctx);
      return this.repo.view(ex,String(h.id));
    });
  }

  private async simpleAdminTransition(id:string,from:string,to:string,eventType:string,data:{comment?:string|null;reason?:string|null},itemStatus?:string){
    const ctx=this.context();return this.tx.run(async ex=>{
      const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('RETURN_NOT_FOUND','درخواست مرجوعی پیدا نشد.');if(String(h.status)!==from)throw new DomainError('INVALID_STATE_TRANSITION','مرجوعی در وضعیت مورد انتظار نیست.');
      const next=await this.repo.transition(ex,String(h.id),to,{comment:data.comment,reason:data.reason});if(itemStatus)await this.repo.setAllItemStatus(ex,String(h.id),itemStatus);
      const actor=this.actor();await this.repo.history(ex,String(h.id),String(h.status),to,data.reason??data.comment??null,actor.type,actor.id);
      await this.outbox.append(ex,[returnEvent(eventType,String(h.id),Number(next.version),{return_id:String(h.id),return_number:String(h.return_number),order_id:String(h.order_id),comment:data.comment??null,reason:data.reason??null,status:to})],ctx);
      return this.repo.view(ex,String(h.id));
    });
  }
}
