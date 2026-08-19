import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotificationRepository } from '../infrastructure/notification.repository';
import { inAppAcknowledgedEvent } from '../domain/notification.events';
@Injectable()
export class NotificationInAppService{
 constructor(private readonly tx:TransactionManager,private readonly repo:NotificationRepository,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter,private readonly outbox:OutboxWriter){}
 private owner(){const a=this.ctx.require().actor;if(!['customer','staff'].includes(a.type)||!a.id)throw new DomainError('NOTIFICATION_INBOX_OWNER_REQUIRED','مالک صندوق اعلان مشخص نیست.');return{type:a.type,id:a.id};}
 async list(opt:any={}){const o=this.owner();return{items:await this.repo.inbox(o.type,o.id,opt)};}
 async markRead(id:string){const o=this.owner();return this.tx.run(async ex=>{const r=await this.repo.markRead(ex,id,o.type,o.id);if(!r)throw new DomainError('NOTIFICATION_IN_APP_NOT_FOUND','اعلان پیدا نشد.');return r;});}
 async acknowledge(id:string){const o=this.owner(),c=this.ctx.require();return this.tx.run(async ex=>{const r=await this.repo.acknowledge(ex,id,o.type,o.id);if(!r){const found=(await this.repo.inbox(o.type,o.id,{limit:100})).find((x:any)=>x.id===id);if(found?.acknowledged_at)return found;throw new DomainError('NOTIFICATION_IN_APP_NOT_FOUND','اعلان پیدا نشد.');}await this.audit.writeWith(ex,{actorType:c.actor.type,actorId:c.actor.id,action:'notifications.in_app.acknowledge',resourceType:'notification_in_app',resourceId:id,requestId:c.requestId,traceId:c.traceId});await this.outbox.append(ex,[inAppAcknowledgedEvent(id,{recipient_subject_type:o.type,recipient_subject_id:o.id})],c);return r;});}
}
