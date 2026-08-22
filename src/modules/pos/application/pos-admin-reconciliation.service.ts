import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { OfflineCommandRepository } from '../infrastructure/offline-command.repository';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PosAdminReconciliationService {
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:OfflineCommandRepository,
    private readonly audit:AuditWriter,
    private readonly ctx:RequestContextStore,
  ){}

  async listFailed(limitInput:unknown=50){
    this.staff();
    const limit=Number(limitInput);
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new DomainError('POS_RECONCILIATION_LIMIT_INVALID','حد فهرست reconciliation معتبر نیست.');
    return this.tx.run(ex=>this.repo.failedForAdmin(ex,limit));
  }

  async inspect(clientCommandIdInput:unknown){
    this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput);
    return this.tx.run(async ex=>{
      const command=await this.repo.byClientCommandId(ex,clientCommandId,false);
      if(!command)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      const history=await this.repo.reconciliationHistory(ex,String(command.id));
      return {command,history};
    });
  }

  async retry(clientCommandIdInput:unknown,noteInput?:unknown){
    const actor=this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput),note=this.note(noteInput);
    return this.tx.run(async ex=>{
      const current=await this.repo.byClientCommandId(ex,clientCommandId,true);
      if(!current)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      if(String(current.status)!=='failed')throw new DomainError('POS_RECONCILIATION_NOT_FAILED','فقط فرمان ناموفق قابل بازیابی مدیریتی است.');
      if(Number(current.recovery_count??0)>=5)throw new DomainError('POS_RECONCILIATION_RETRY_LIMIT','حداکثر دفعات بازیابی فرمان آفلاین مصرف شده است.');
      const saved=await this.repo.adminReopenFailedForRetry(ex,{id:String(current.id),adminActorId:actor.id!,note,historyId:randomUUID()});
      if(!saved)throw new DomainError('POS_RECONCILIATION_CONFLICT','وضعیت فرمان آفلاین همزمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:'staff',actorId:actor.id,action:'pos.reconciliation.admin_retry',resourceType:'pos.offline_command',resourceId:String(current.id),beforeData:{status:current.status,error_code:current.error_code,recovery_count:current.recovery_count},afterData:{status:saved.status,recovery_count:saved.recovery_count,owner_staff_actor_id:saved.staff_actor_id},reason:note??undefined,requestId:this.ctx.get()?.requestId,traceId:this.ctx.get()?.correlationId});
      return {command:saved,requires_owner_sync:true};
    });
  }

  async abandon(clientCommandIdInput:unknown,noteInput?:unknown){
    const actor=this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput),note=this.note(noteInput);
    return this.tx.run(async ex=>{
      const current=await this.repo.byClientCommandId(ex,clientCommandId,true);
      if(!current)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      if(String(current.status)==='abandoned')return current;
      if(String(current.status)!=='failed')throw new DomainError('POS_RECONCILIATION_NOT_FAILED','فقط فرمان ناموفق قابل کنارگذاری مدیریتی است.');
      const saved=await this.repo.adminAbandonFailed(ex,{id:String(current.id),adminActorId:actor.id!,note,historyId:randomUUID()});
      if(!saved)throw new DomainError('POS_RECONCILIATION_CONFLICT','وضعیت فرمان آفلاین همزمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:'staff',actorId:actor.id,action:'pos.reconciliation.admin_abandon',resourceType:'pos.offline_command',resourceId:String(current.id),beforeData:{status:current.status,error_code:current.error_code,recovery_count:current.recovery_count},afterData:{status:saved.status,recovery_count:saved.recovery_count,owner_staff_actor_id:saved.staff_actor_id},reason:note??undefined,requestId:this.ctx.get()?.requestId,traceId:this.ctx.get()?.correlationId});
      return saved;
    });
  }

  private staff(){const actor=this.ctx.get()?.actor;if(actor?.type!=='staff'||!actor.id)throw new DomainError('POS_STAFF_REQUIRED','عملیات مدیریتی POS فقط برای کاربر سازمانی مجاز است.');return actor;}
  private uuid(value:unknown){const v=String(value??'').trim().toLowerCase();if(!UUID_RE.test(v))throw new DomainError('POS_OFFLINE_COMMAND_ID_INVALID','شناسه فرمان آفلاین معتبر نیست.');return v;}
  private note(value:unknown){if(value==null)return null;const v=String(value).trim();if(v.length<1||v.length>500||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v))throw new DomainError('POS_RECONCILIATION_NOTE_INVALID','یادداشت reconciliation معتبر نیست.');return v;}
}
