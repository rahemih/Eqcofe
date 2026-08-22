import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OfflineCommandRepository } from '../infrastructure/offline-command.repository';
import { OfflineCommandSyncService } from './offline-command-sync.service';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OfflineReconciliationService {
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:OfflineCommandRepository,
    private readonly syncService:OfflineCommandSyncService,
    private readonly ctx:RequestContextStore,
  ){}

  async listFailed(limitInput:unknown=50){
    const actor=this.staff();
    const limit=Number(limitInput);
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new DomainError('POS_RECONCILIATION_LIMIT_INVALID','حد فهرست reconciliation معتبر نیست.');
    return this.tx.run(ex=>this.repo.failedForStaff(ex,actor.id!,limit));
  }

  async inspect(clientCommandIdInput:unknown){
    const actor=this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput,'POS_OFFLINE_COMMAND_ID_INVALID');
    return this.tx.run(async ex=>{
      const command=await this.repo.byClientCommandId(ex,clientCommandId,false);
      if(!command||String(command.staff_actor_id)!==actor.id)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      const history=await this.repo.reconciliationHistory(ex,String(command.id));
      return {command,history};
    });
  }

  async retry(clientCommandIdInput:unknown,noteInput?:unknown){
    const actor=this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput,'POS_OFFLINE_COMMAND_ID_INVALID');
    const note=this.note(noteInput);
    const reopened=await this.tx.run(async ex=>{
      const command=await this.repo.byClientCommandId(ex,clientCommandId,true);
      if(!command||String(command.staff_actor_id)!==actor.id)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      if(String(command.status)==='applied')return command;
      if(String(command.status)==='abandoned')throw new DomainError('POS_RECONCILIATION_TERMINAL','فرمان آفلاین کنار گذاشته شده و قابل بازیابی نیست.');
      if(String(command.status)!=='failed')throw new DomainError('POS_RECONCILIATION_NOT_FAILED','فقط فرمان ناموفق قابل retry reconciliation است.');
      if(Number(command.recovery_count??0)>=5)throw new DomainError('POS_RECONCILIATION_RETRY_LIMIT','حداکثر دفعات بازیابی فرمان آفلاین مصرف شده است.');
      const saved=await this.repo.reopenFailedForRetry(ex,{id:String(command.id),actorId:actor.id!,note,historyId:randomUUID()});
      if(!saved)throw new DomainError('POS_RECONCILIATION_CONFLICT','وضعیت فرمان آفلاین همزمان تغییر کرده است.');
      return saved;
    });
    if(String(reopened.status)==='applied')return reopened;
    return this.syncService.sync(clientCommandId);
  }

  async abandon(clientCommandIdInput:unknown,noteInput?:unknown){
    const actor=this.staff();
    const clientCommandId=this.uuid(clientCommandIdInput,'POS_OFFLINE_COMMAND_ID_INVALID');
    const note=this.note(noteInput);
    return this.tx.run(async ex=>{
      const command=await this.repo.byClientCommandId(ex,clientCommandId,true);
      if(!command||String(command.staff_actor_id)!==actor.id)throw new DomainError('POS_OFFLINE_COMMAND_NOT_FOUND','فرمان آفلاین POS پیدا نشد.');
      if(String(command.status)==='abandoned')return command;
      if(String(command.status)==='applied')throw new DomainError('POS_RECONCILIATION_ALREADY_APPLIED','فرمان اعمال‌شده قابل کنارگذاری نیست.');
      if(String(command.status)!=='failed')throw new DomainError('POS_RECONCILIATION_NOT_FAILED','فقط فرمان ناموفق قابل کنارگذاری است.');
      const saved=await this.repo.abandonFailed(ex,{id:String(command.id),actorId:actor.id!,note,historyId:randomUUID()});
      if(!saved)throw new DomainError('POS_RECONCILIATION_CONFLICT','وضعیت فرمان آفلاین همزمان تغییر کرده است.');
      return saved;
    });
  }

  private note(value:unknown){
    if(value==null)return null;
    const note=String(value).trim();
    if(note.length<1||note.length>500||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(note))throw new DomainError('POS_RECONCILIATION_NOTE_INVALID','یادداشت reconciliation معتبر نیست.');
    return note;
  }

  private staff(){const actor=this.ctx.get()?.actor;if(actor?.type!=='staff'||!actor.id)throw new DomainError('POS_STAFF_REQUIRED','reconciliation فروش حضوری فقط برای کاربر سازمانی مجاز است.');return actor;}
  private uuid(value:unknown,code:string){const v=String(value??'').trim().toLowerCase();if(!UUID_RE.test(v))throw new DomainError(code,'شناسه معتبر نیست.');return v;}
}
