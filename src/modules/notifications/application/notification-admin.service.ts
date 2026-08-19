import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotificationOperationsService } from './notification-operations.service';
import { NotificationDeliveryRepository } from '../infrastructure/notification-delivery.repository';
@Injectable() export class NotificationAdminService{
 constructor(private readonly tx:TransactionManager,private readonly repo:NotificationDeliveryRepository,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter,private readonly operations:NotificationOperationsService){}
 private staff(){const a=this.ctx.get()?.actor;if(a?.type!=='staff'||!a.id)throw new DomainError('STAFF_REQUIRED','دسترسی مدیر الزامی است.');return a.id;}
 private uuid(v:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return v;}
 async list(q:any={}){this.staff();return{items:await this.repo.adminList({status:q.status,channel:q.channel,limit:q.limit,offset:q.offset})};}
 async get(id:string){this.staff();const row=await this.repo.adminGet(this.uuid(id));if(!row)throw new DomainError('NOTIFICATION_NOT_FOUND','اعلان پیدا نشد.');return row;}
 async operationsSummary(){this.staff();return this.operations.summary();}
 async retry(id:string){const actor=this.staff(),ctx=this.ctx.require();return this.tx.run(async ex=>{const before=await this.repo.adminGet(this.uuid(id),ex,true);if(!before)throw new DomainError('NOTIFICATION_NOT_FOUND','اعلان پیدا نشد.');const changed=await this.repo.manualRetry(ex,id);if(!changed.length)throw new DomainError('NOTIFICATION_RETRY_NOT_ELIGIBLE','هیچ کانال قابل تلاش مجددی وجود ندارد.');await this.audit.writeWith(ex,{actorType:'staff',actorId:actor,action:'notifications.retry',resourceType:'notification',resourceId:id,beforeData:{status:before.status},afterData:{status:'queued',delivery_ids:changed.map((x:any)=>x.id)},requestId:ctx.requestId,traceId:ctx.traceId});return{notification_id:id,retried_delivery_ids:changed.map((x:any)=>x.id)};});}
}
