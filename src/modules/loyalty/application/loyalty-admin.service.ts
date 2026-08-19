import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { CustomerRepository } from '../../customer/infrastructure/customer.repository';
import { PointsRepository } from '../infrastructure/points.repository';

@Injectable()
export class LoyaltyAdminService {
  constructor(private readonly tx:TransactionManager,private readonly points:PointsRepository,private readonly customers:CustomerRepository,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter){}

  async balance(customerId:string){this.staff();await this.active(customerId);return {customer_id:customerId,balance:await this.points.balance(customerId),unit:'points' as const,cash_value:null};}
  async history(customerId:string,limit=100){this.staff();await this.active(customerId);const safe=Number.isSafeInteger(limit)?Math.min(Math.max(limit,1),200):100;return {items:await this.points.history(customerId,safe)};}

  async adjust(customerId:string,body:any){
    const actorId=this.staff();await this.active(customerId);const delta=Number(body?.points_delta);if(!Number.isSafeInteger(delta)||delta===0)throw new DomainError('LOYALTY_INVALID_POINTS','تغییر امتیاز باید عدد صحیح غیرصفر باشد.');const referenceType=this.ref(body?.reference_type,80),referenceId=this.ref(body?.reference_id,200),reason=this.ref(body?.reason,500);const request=this.ctx.require();
    return this.tx.run(async ex=>{const before=await this.points.balance(customerId,ex);const row=await this.points.append(ex,{id:randomUUID(),customerId,type:'adjust',pointsDelta:delta,referenceType,referenceId,metadata:{reason}});if(!row){const existing=(await this.points.history(customerId,200,ex)).find(x=>x.entry_type==='adjust'&&x.reference_type===referenceType&&x.reference_id===referenceId);if(existing&&Number(existing.points_delta)===delta)return existing;throw new DomainError('LOYALTY_DUPLICATE_ENTRY','مرجع اصلاح امتیاز قبلاً با مقدار دیگری ثبت شده است.');}const after=before+delta;await this.audit.writeWith(ex,{actorType:'staff',actorId,action:'loyalty.points.adjust',resourceType:'customer',resourceId:customerId,beforeData:{points:before},afterData:{points:after,delta,entry_id:row.id,reference_type:referenceType,reference_id:referenceId},reason,requestId:request.requestId,traceId:request.traceId});return row;});
  }

  async reverse(customerId:string,entryId:string,body:any){
    const actorId=this.staff();await this.active(customerId);const referenceType=this.ref(body?.reference_type,80),referenceId=this.ref(body?.reference_id,200),reason=this.ref(body?.reason,500),request=this.ctx.require();
    return this.tx.run(async ex=>{const original=await this.points.byId(customerId,this.uuid(entryId),ex,true);if(!original||original.entry_type==='reverse')throw new DomainError('LOYALTY_INVALID_REVERSAL','رکورد امتیاز قابل برگشت نیست.');const before=await this.points.balance(customerId,ex);const delta=-Number(original.points_delta);const row=await this.points.append(ex,{id:randomUUID(),customerId,type:'reverse',pointsDelta:delta,referenceType,referenceId,reversesEntryId:original.id,metadata:{reason}});if(!row){const existing=(await this.points.history(customerId,200,ex)).find(x=>x.entry_type==='reverse'&&x.reference_type===referenceType&&x.reference_id===referenceId);if(existing&&existing.reverses_entry_id===original.id)return existing;throw new DomainError('LOYALTY_DUPLICATE_ENTRY','مرجع برگشت امتیاز قبلاً استفاده شده است.');}await this.audit.writeWith(ex,{actorType:'staff',actorId,action:'loyalty.points.reverse',resourceType:'customer',resourceId:customerId,beforeData:{points:before,original_entry_id:original.id,original_delta:Number(original.points_delta)},afterData:{points:before+delta,delta,entry_id:row.id},reason,requestId:request.requestId,traceId:request.traceId});return row;});
  }

  private staff(){const actor=this.ctx.get()?.actor;if(actor?.type!=='staff'||!actor.id)throw new DomainError('STAFF_REQUIRED','دسترسی مدیر الزامی است.');return actor.id;}
  private async active(id:string){const customerId=this.uuid(id);const c=await this.customers.profileById(customerId);if(!c||c.status!=='active')throw new DomainError('CUSTOMER_NOT_ACTIVE','مشتری فعال پیدا نشد.');}
  private uuid(v:any){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private ref(v:any,max:number){const x=String(v??'').trim();if(!x||x.length>max)throw new DomainError('VALIDATION_ERROR','مرجع یا دلیل معتبر نیست.');return x;}
}
