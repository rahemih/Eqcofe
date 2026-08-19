import { Inject,Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { ORDER_WARRANTY_PORT,OrderWarrantyPort } from '../../orders/application/ports/order-warranty.port';
import { WarrantyRepository } from '../infrastructure/warranty.repository';
import { warrantyEvent } from '../domain/warranty.events';
import { AfterSalesIntegrationService } from '../../after-sales/application/after-sales-integration.service';
@Injectable()
export class WarrantyService{
  constructor(private readonly tx:TransactionManager,private readonly repo:WarrantyRepository,private readonly outbox:OutboxWriter,
    private readonly ctx:RequestContextStore,@Inject(ORDER_WARRANTY_PORT) private readonly orders:OrderWarrantyPort,private readonly afterSales:AfterSalesIntegrationService){}
  private customerId(){const a=this.ctx.get()?.actor;if(a?.type!=='customer'||!a.id)throw new DomainError('CUSTOMER_REQUIRED','ورود مشتری الزامی است.');return a.id;}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private actor(){const a=this.ctx.get()?.actor;return{type:a?.type??'system',id:a?.id??null};}
  private number(){return `WAR-${randomUUID().replaceAll('-','').toUpperCase()}`;}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number,required=false){const x=v==null?'':String(v).trim();if((required&&!x)||x.length>max)throw new DomainError('VALIDATION_ERROR','متن ورودی معتبر نیست.');return x||null;}

  async createCustomer(input:{order_item_id:string;issue_type:string;issue_description:string;preferred_resolution?:'repair'|'replacement'|'refund'|'inspection'|null}){
    const customerId=this.customerId(),orderItemId=this.uuid(input?.order_item_id),issueType=this.text(input?.issue_type,80,true)!,
      issueDescription=this.text(input?.issue_description,4000,true)!,preferred=input?.preferred_resolution??null;
    if(preferred&&!['repair','replacement','refund','inspection'].includes(preferred))throw new DomainError('VALIDATION_ERROR','نوع نتیجه ترجیحی گارانتی معتبر نیست.');
    const ctx=this.context();
    return this.tx.run(async ex=>{
      const item=await this.orders.getOwnedItemForWarranty(ex,orderItemId,customerId,true);if(!item)throw new DomainError('ORDER_ITEM_NOT_FOUND','قلم سفارش پیدا نشد.');
      if(!['confirmed','completed'].includes(item.orderStatus))throw new DomainError('WARRANTY_ORDER_NOT_ELIGIBLE','سفارش در وضعیت قابل گارانتی نیست.');
      const id=randomUUID(),number=this.number();const claim=await this.repo.create(ex,{id,number,customerId,orderId:item.orderId,orderItemId,issueType,issueDescription,preferredResolution:preferred});
      const actor=this.actor();await this.repo.history(ex,id,null,'requested',null,actor.type,actor.id);
      await this.outbox.append(ex,[warrantyEvent('warranty.claim_requested.v1',id,1,{claim_id:id,claim_number:number,customer_id:customerId,order_id:item.orderId,order_item_id:orderItemId,issue_type:issueType,preferred_resolution:preferred})],ctx);
      return claim;
    });
  }
  async listCustomer(){return this.repo.listCustomer(this.customerId());}
  async getCustomer(number:string){const x=await this.repo.byNumber(this.repo.db(),number,this.customerId(),false);if(!x)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');return x;}
  async timelineCustomer(number:string){
    const h=await this.repo.byNumber(this.repo.db(),number,this.customerId(),false);
    if(!h)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');
    return{claim_number:number,timeline:await this.repo.timeline(this.repo.db(),String(h.id))};
  }
  async listAdmin(){return this.repo.listAdmin();}
  async getAdmin(id:string){const x=await this.repo.byId(this.repo.db(),this.uuid(id),false);if(!x)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');return x;}
  async timelineAdmin(id:string){
    const h=await this.repo.byId(this.repo.db(),this.uuid(id),false);
    if(!h)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');
    return{claim_id:String(h.id),timeline:await this.repo.timeline(this.repo.db(),String(h.id))};
  }
  async startReview(id:string,comment?:string|null){return this.simpleTransition(id,'requested','under_review','warranty.review_started.v1',{comment:this.text(comment,2000,false)});}
  async approve(id:string,comment?:string|null){return this.simpleTransition(id,'under_review','approved','warranty.approved.v1',{comment:this.text(comment,2000,false)});}
  async reject(id:string,reasonInput?:string|null){const reason=this.text(reasonInput,2000,true)!;return this.simpleTransition(id,'under_review','rejected','warranty.rejected.v1',{reason});}
  async receive(id:string,input:{received_at?:string|null;condition_note?:string|null}={}){
    const receivedAt=input.received_at==null?null:new Date(String(input.received_at));if(receivedAt&&Number.isNaN(receivedAt.getTime()))throw new DomainError('VALIDATION_ERROR','زمان دریافت معتبر نیست.');
    if(receivedAt&&receivedAt.getTime()>Date.now()+5*60_000)throw new DomainError('WARRANTY_RECEIVED_AT_INVALID','زمان دریافت نمی‌تواند در آینده باشد.');
    const condition=this.text(input.condition_note,4000,false),ctx=this.context();
    return this.tx.run(async ex=>{const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');
      if(String(h.status)!=='approved')throw new DomainError('INVALID_STATE_TRANSITION','درخواست گارانتی در وضعیت قابل دریافت نیست.');
      const next=await this.repo.transition(ex,String(h.id),'received',{receivedAt,conditionNote:condition});const actor=this.actor();
      await this.repo.history(ex,String(h.id),String(h.status),'received',condition,actor.type,actor.id);
      await this.outbox.append(ex,[warrantyEvent('warranty.received.v1',String(h.id),Number(next.version),{claim_id:String(h.id),claim_number:String(h.claim_number),order_id:String(h.order_id),order_item_id:String(h.order_item_id),received_at:next.received_at,condition_note:condition})],ctx);return next;});
  }
  async startRepair(id:string,comment?:string|null){return this.simpleTransition(id,'received','repairing','warranty.repair_started.v1',{comment:this.text(comment,2000,false)});}
  async resolve(id:string,input:{resolution_note:string;warranty_action:{resolution:'repair'|'replacement'|'refund'|'inspection'|'no_action';refund_amount_toman?:number|null;quantity?:number|null}}){
    const note=this.text(input?.resolution_note,4000,true)!,action=input?.warranty_action;
    if(!action||!['repair','replacement','refund','inspection','no_action'].includes(String(action.resolution)))throw new DomainError('WARRANTY_RESOLUTION_ACTION_REQUIRED','نوع تعیین تکلیف گارانتی الزامی است.');
    const quantity=action.quantity==null?null:Number(action.quantity),refundAmount=action.refund_amount_toman==null?null:Number(action.refund_amount_toman);
    if(['refund','replacement'].includes(action.resolution)&&(!Number.isInteger(quantity)||Number(quantity)<=0))throw new DomainError('WARRANTY_RESOLUTION_QUANTITY_REQUIRED','تعداد برای بازپرداخت یا جایگزینی گارانتی الزامی است.');
    if(action.resolution==='refund'&&(!Number.isSafeInteger(refundAmount)||Number(refundAmount)<=0))throw new DomainError('WARRANTY_REFUND_AMOUNT_REQUIRED','مبلغ بازپرداخت گارانتی الزامی است.');
    if(action.resolution!=='refund'&&refundAmount!=null)throw new DomainError('WARRANTY_REFUND_AMOUNT_UNEXPECTED','مبلغ بازپرداخت فقط برای resolution بازپرداخت مجاز است.');
    const ctx=this.context();
    return this.tx.run(async ex=>{
      const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');
      if(!['received','repairing'].includes(String(h.status)))throw new DomainError('INVALID_STATE_TRANSITION','درخواست گارانتی در وضعیت قابل تعیین تکلیف نیست.');
      const orderItem=await this.afterSales.orderItem(ex,String(h.order_id),String(h.order_item_id),true);
      const delivery=await this.afterSales.fulfillment.deliveredItem(ex,String(h.order_id),String(h.order_item_id),true);
      if(quantity!=null&&Number(quantity)>delivery.deliveredQuantity)throw new DomainError('WARRANTY_QUANTITY_EXCEEDS_DELIVERED','تعداد تعیین تکلیف از مقدار تحویل‌شده بیشتر است.');

      let refundId:string|null=null,replacementRequestId:string|null=null;
      if(action.resolution==='refund'){
        const max=this.afterSales.maxRefundForQuantity(orderItem,Number(quantity));
        if(Number(refundAmount)>max)throw new DomainError('WARRANTY_REFUND_LINE_CAP_EXCEEDED','مبلغ بازپرداخت از ارزش قلم گارانتی بیشتر است.',{max_refund_toman:max});
        const refund=await this.afterSales.payments.requestRefundInTransaction(ex,{orderId:String(h.order_id),amountToman:Number(refundAmount),reasonCode:'warranty_resolution'});
        refundId=refund.refundId;
      }
      if(action.resolution==='replacement'){
        const rep=await this.afterSales.requestReplacementInTransaction(ex,{sourceType:'warranty_claim',sourceId:String(h.id),orderId:String(h.order_id),orderItemId:String(h.order_item_id),customerId:String(h.customer_id),variantId:orderItem.variantId,quantity:Number(quantity),note});
        replacementRequestId=String(rep.id);
      }
      const next=await this.repo.resolveClaim(ex,String(h.id),{resolution:action.resolution,resolutionNote:note,refundId,replacementRequestId});
      if(!next)throw new DomainError('INVALID_STATE_TRANSITION','درخواست گارانتی هم‌زمان تغییر کرده است.');
      const actor=this.actor();await this.repo.history(ex,String(h.id),String(h.status),'resolved',note,actor.type,actor.id);
      await this.outbox.append(ex,[warrantyEvent('warranty.resolved.v1',String(h.id),Number(next.version),{claim_id:String(h.id),claim_number:String(h.claim_number),order_id:String(h.order_id),order_item_id:String(h.order_item_id),resolution:action.resolution,quantity,refund_id:refundId,replacement_request_id:replacementRequestId,resolution_note:note})],ctx);
      return next;
    });
  }
  async close(id:string,resolutionNote:string){
    const note=this.text(resolutionNote,4000,true)!,ctx=this.context();
    return this.tx.run(async ex=>{const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');
      if(String(h.status)!=='resolved')throw new DomainError('INVALID_STATE_TRANSITION','فقط درخواست گارانتی حل‌شده قابل بستن است.');
      const next=await this.repo.transition(ex,String(h.id),'closed',{resolutionNote:note});const actor=this.actor();
      await this.repo.history(ex,String(h.id),String(h.status),'closed',note,actor.type,actor.id);
      await this.outbox.append(ex,[warrantyEvent('warranty.closed.v1',String(h.id),Number(next.version),{claim_id:String(h.id),claim_number:String(h.claim_number),order_id:String(h.order_id),order_item_id:String(h.order_item_id),resolution_note:note})],ctx);return next;});
  }
  private async simpleTransition(id:string,from:string,to:string,eventType:string,data:{comment?:string|null;reason?:string|null}){
    const ctx=this.context();return this.tx.run(async ex=>{const h=await this.repo.byId(ex,this.uuid(id),true);if(!h)throw new DomainError('WARRANTY_CLAIM_NOT_FOUND','درخواست گارانتی پیدا نشد.');
      if(String(h.status)!==from)throw new DomainError('INVALID_STATE_TRANSITION','درخواست گارانتی در وضعیت مورد انتظار نیست.');
      const next=await this.repo.transition(ex,String(h.id),to,{comment:data.comment,reason:data.reason});const actor=this.actor();
      await this.repo.history(ex,String(h.id),String(h.status),to,data.reason??data.comment??null,actor.type,actor.id);
      await this.outbox.append(ex,[warrantyEvent(eventType,String(h.id),Number(next.version),{claim_id:String(h.id),claim_number:String(h.claim_number),order_id:String(h.order_id),order_item_id:String(h.order_item_id),comment:data.comment??null,reason:data.reason??null,status:to})],ctx);return next;});
  }
}
