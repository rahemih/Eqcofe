import { Inject,Injectable } from '@nestjs/common';
import { createHash,randomUUID } from 'node:crypto';
import { TransactionManager,DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { NOTIFICATION_RECIPIENT_PORT,NotificationRecipientPort,NotificationSubjectType } from './ports/notification-recipient.port';
import { NotificationRoutingPolicy } from '../domain/notification-routing.policy';
import { NotificationRepository } from '../infrastructure/notification.repository';
import { NotificationTemplateService } from './notification-template.service';
import { notificationQueuedEvent } from '../domain/notification.events';
@Injectable()
export class NotificationCommandService{
 constructor(private readonly tx:TransactionManager,private readonly repo:NotificationRepository,private readonly templates:NotificationTemplateService,@Inject(NOTIFICATION_RECIPIENT_PORT)private readonly recipients:NotificationRecipientPort,private readonly routing:NotificationRoutingPolicy,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter,private readonly outbox:OutboxWriter){}
 private mask(channel:string,v:string|null){if(!v)return null;if(channel==='email'){const [a,b]=v.split('@');return b?`${(a??'').slice(0,2)}***@${b}`:'***';}return v.length>4?`${'*'.repeat(Math.max(3,v.length-4))}${v.slice(-4)}`:'***';}
 async enqueue(input:any){const c=this.ctx.require();return this.prepareAndWrite(input,undefined,{actorType:c.actor.type,actorId:c.actor.id,requestId:c.requestId,traceId:c.traceId});}
 async enqueueInternal(input:any){const c=this.ctx.get();return this.prepareAndWrite(input,undefined,{actorType:'system',requestId:c?.requestId,traceId:c?.traceId});}
 async enqueueFromIntegrationEvent(ex:DatabaseExecutor,input:any,meta:{eventId:string;traceId?:string|null;correlationId?:string|null;causationId?:string|null}){return this.prepareAndWrite({...input,source_event_id:meta.eventId,_event_correlation_id:meta.correlationId??meta.eventId,_event_causation_id:meta.causationId??meta.eventId},ex,{actorType:'system',actorId:undefined,requestId:undefined,traceId:meta.traceId??undefined});}
 private async prepareAndWrite(input:any,existingEx:DatabaseExecutor|undefined,auditCtx:{actorType:string;actorId?:string;requestId?:string;traceId?:string}){
  const kind=String(input.notification_kind??input.kind??'').trim(),templateKey=String(input.template_key??kind).trim(),sourceType=String(input.source_type??'internal').trim(),sourceId=String(input.source_id??'').trim(),subjectType=String(input.recipient_subject_type??'customer') as NotificationSubjectType,subjectId=String(input.recipient_subject_id??'').trim(),routingRevision=Math.max(1,Number(input.routing_revision??1)),idempotencyKey=String(input.idempotency_key??'').trim()||null,locale=String(input.locale??'fa-IR'),payload=input.variables&&typeof input.variables==='object'?input.variables:{},scheduledAt=input.scheduled_at?new Date(input.scheduled_at):null;
  if(scheduledAt&&(!Number.isFinite(scheduledAt.getTime())||scheduledAt.getTime()<Date.now()-1000))throw new DomainError('NOTIFICATION_SCHEDULE_INVALID','زمان‌بندی اعلان معتبر نیست.');
  if(!kind||!sourceId||!subjectId)throw new DomainError('NOTIFICATION_COMMAND_INVALID','فرمان اعلان نامعتبر است.');
  const readEx=existingEx??this.tx.readonly();
  if(idempotencyKey){const existing=await this.repo.byIdempotency(idempotencyKey,readEx);if(existing)return existing;}
  const sourceExisting=await this.repo.bySource(readEx,{sourceType,sourceId,kind,subjectType,subjectId,routingRevision});if(sourceExisting)return sourceExisting;
  const recipient=await this.recipients.resolve(subjectType,subjectId);if(!recipient)throw new DomainError('NOTIFICATION_RECIPIENT_NOT_FOUND','گیرنده اعلان پیدا نشد.');
  const channels=this.routing.channels(recipient,input.channels);const rendered=[] as any[];
  for(const channel of channels){const r=await this.templates.renderActive(templateKey,channel,locale,payload);const dest=channel==='sms'?recipient.mobile:channel==='email'?recipient.email:null;rendered.push({channel,dest,template:r.template,rendered:r.rendered});}
  const write=async(ex:DatabaseExecutor)=>{const id=randomUUID();let row=await this.repo.createIntent(ex,{id,kind,sourceType,sourceId,sourceEventId:input.source_event_id??null,subjectType,subjectId,routingRevision,priority:Number(input.priority??50),locale,payload,idempotencyKey,scheduledAt});if(!row){row=(idempotencyKey?await this.repo.byIdempotency(idempotencyKey,ex):null)??await this.repo.bySource(ex,{sourceType,sourceId,kind,subjectType,subjectId,routingRevision});if(!row)throw new DomainError('NOTIFICATION_ENQUEUE_CONFLICT','ثبت اعلان با تداخل همزمانی مواجه شد.');return row;}
    for(const x of rendered){const deliveryId=randomUUID(),sha=createHash('sha256').update(`${x.rendered.subject??''}\n${x.rendered.body}`).digest('hex'),status=x.channel==='in_app'?'delivered':'pending';const d=await this.repo.createDelivery(ex,{id:deliveryId,notificationId:row.id,channel:x.channel,status,templateId:x.template.id,templateKey:x.template.template_key,templateVersion:Number(x.template.version),destinationMasked:this.mask(x.channel,x.dest),subject:x.rendered.subject,body:x.rendered.body,sha256:sha,maxAttempts:5});if(x.channel==='in_app'&&d)await this.repo.createInAppReceipt(ex,{deliveryId:d.id,subjectType,subjectId,title:x.rendered.subject,body:x.rendered.body,payload:{notification_kind:kind}});}
    await this.audit.writeWith(ex,{actorType:auditCtx.actorType,actorId:auditCtx.actorId,action:'notifications.enqueue',resourceType:'notification',resourceId:row.id,afterData:{notification_kind:kind,channels,recipient_subject_type:subjectType,recipient_subject_id:subjectId},requestId:auditCtx.requestId,traceId:auditCtx.traceId});
    const eventContext:any={actor:{type:auditCtx.actorType,id:auditCtx.actorId},requestId:auditCtx.requestId??`event:${input.source_event_id??sourceId}`,traceId:auditCtx.traceId,correlationId:input._event_correlation_id??input.source_event_id??sourceId,causationId:input._event_causation_id??input.source_event_id??null};await this.outbox.append(ex,[notificationQueuedEvent(row.id,{notification_kind:kind,channels,recipient_subject_type:subjectType,recipient_subject_id:subjectId})],eventContext);return row;};
  return existingEx?write(existingEx):this.tx.run(write);
 }
}
