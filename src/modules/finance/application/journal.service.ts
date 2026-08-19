import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { financeEvent } from '../domain/finance.events';

type JournalLineInput={account_id:string;debit_toman?:number;credit_toman?:number;description?:string|null};

@Injectable()
export class JournalService{
  constructor(private readonly tx:TransactionManager,private readonly repo:FinanceRepository,private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,private readonly ctx:RequestContextStore){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number,required=true){const x=String(v??'').trim();if((required&&!x)||x.length>max)throw new DomainError('VALIDATION_ERROR','متن ورودی معتبر نیست.');return x;}
  private money(v:unknown){const n=Number(v??0);if(!Number.isSafeInteger(n)||n<0)throw new DomainError('FINANCE_MONEY_INVALID','مبلغ مالی معتبر نیست.');return n;}
  private number(){return `JRN-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}-${randomUUID().slice(0,8).toUpperCase()}`;}

  list(limit=200){const n=Number(limit);return this.repo.listJournals(Number.isInteger(n)&&n>0?Math.min(n,500):200);}
  async get(id:string){const x=await this.repo.journalView(this.repo.db(),this.uuid(id));if(!x)throw new DomainError('FINANCE_JOURNAL_NOT_FOUND','سند مالی پیدا نشد.');return x;}

  async createDraft(input:{description:string;occurred_at:string;lines:JournalLineInput[];source_type?:string|null;source_id?:string|null;source_event_id?:string|null}){
    const description=this.text(input?.description,1000),occurredAt=new Date(String(input?.occurred_at??''));
    if(Number.isNaN(occurredAt.getTime()))throw new DomainError('FINANCE_OCCURRED_AT_INVALID','زمان سند معتبر نیست.');
    if(occurredAt.getTime()>Date.now()+5*60_000)throw new DomainError('FINANCE_OCCURRED_AT_FUTURE','زمان سند نمی‌تواند در آینده باشد.');
    const lines=input?.lines;if(!Array.isArray(lines)||lines.length<2||lines.length>500)throw new DomainError('FINANCE_JOURNAL_LINES_INVALID','سند باید حداقل دو خط داشته باشد.');
    const normalized=lines.map(x=>({accountId:this.uuid(x.account_id),debit:this.money(x.debit_toman),credit:this.money(x.credit_toman),description:x.description==null?null:this.text(x.description,1000,false)}));
    let debit=0,credit=0;
    for(const l of normalized){
      if((l.debit>0)===(l.credit>0))throw new DomainError('FINANCE_JOURNAL_LINE_SIDE_INVALID','هر خط سند باید فقط بدهکار یا فقط بستانکار باشد.');
      debit+=l.debit;credit+=l.credit;
      if(!Number.isSafeInteger(debit)||!Number.isSafeInteger(credit))throw new DomainError('FINANCE_MONEY_OVERFLOW','جمع سند از محدوده امن خارج است.');
    }
    if(debit!==credit)throw new DomainError('FINANCE_JOURNAL_UNBALANCED','جمع بدهکار و بستانکار برابر نیست.');
    const sourceType=input.source_type==null?null:this.text(input.source_type,60),sourceId=input.source_id==null?null:this.uuid(input.source_id),sourceEventId=input.source_event_id==null?null:this.uuid(input.source_event_id);
    const ctx=this.context(),id=randomUUID(),entryNumber=this.number();
    return this.tx.run(async ex=>{
      const accountIds=[...new Set(normalized.map(x=>x.accountId))];
      for(const accountId of accountIds){
        const a=await this.repo.accountById(ex,accountId,true);
        if(!a)throw new DomainError('FINANCE_ACCOUNT_NOT_FOUND','یکی از حساب‌های سند پیدا نشد.');
        if(!a.is_active||!a.is_postable)throw new DomainError('FINANCE_JOURNAL_ACCOUNT_NOT_POSTABLE','یکی از حساب‌ها برای ثبت سند مجاز نیست.');
      }
      const h=await this.repo.createJournal(ex,{id,entryNumber,description,occurredAt,status:'draft',sourceType,sourceId,sourceEventId,createdBy:ctx.actor.id});
      for(const l of normalized)await this.repo.createJournalLine(ex,{id:randomUUID(),journalId:id,accountId:l.accountId,debitToman:l.debit,creditToman:l.credit,description:l.description});
      const view=await this.repo.journalView(ex,id);
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.journal.create',resourceType:'finance_journal',resourceId:id,afterData:view,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.journal.created.v1','finance_journal',id,1,{journal_id:id,entry_number:entryNumber,status:'draft',debit_toman:debit,credit_toman:credit,source_type:sourceType,source_id:sourceId})],ctx);
      return view;
    });
  }

  async post(idInput:string,reasonInput:string){
    const id=this.uuid(idInput),reason=this.text(reasonInput,2000),ctx=this.context();
    return this.tx.run(async ex=>{
      const before=await this.repo.journalById(ex,id,true);if(!before)throw new DomainError('FINANCE_JOURNAL_NOT_FOUND','سند مالی پیدا نشد.');
      if(String(before.status)!=='draft')throw new DomainError('FINANCE_JOURNAL_NOT_DRAFT','فقط سند پیش‌نویس قابل ثبت قطعی است.');
      const lines=await this.repo.journalLines(ex,id);if(lines.length<2)throw new DomainError('FINANCE_JOURNAL_MIN_LINES','سند حداقل دو خط نیاز دارد.');
      const debit=lines.reduce((s:any,x:any)=>s+Number(x.debit_toman),0),credit=lines.reduce((s:any,x:any)=>s+Number(x.credit_toman),0);
      if(debit!==credit)throw new DomainError('FINANCE_JOURNAL_UNBALANCED','جمع بدهکار و بستانکار برابر نیست.');
      for(const l of lines){const a=await this.repo.accountById(ex,String(l.account_id),true);if(!a||!a.is_active||!a.is_postable)throw new DomainError('FINANCE_JOURNAL_ACCOUNT_NOT_POSTABLE','یکی از حساب‌ها برای ثبت سند مجاز نیست.');}
      const row=await this.repo.postJournal(ex,id,ctx.actor.id);if(!row)throw new DomainError('FINANCE_JOURNAL_STATE_CHANGED','وضعیت سند هم‌زمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.journal.post',resourceType:'finance_journal',resourceId:id,beforeData:before,afterData:row,reason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.journal.posted.v1','finance_journal',id,Number(row.version),{journal_id:id,entry_number:String(row.entry_number),debit_toman:debit,credit_toman:credit,posted_at:row.posted_at,reason})],ctx);
      return this.repo.journalView(ex,id);
    });
  }

  async reverse(idInput:string,reasonInput:string){
    const id=this.uuid(idInput),reason=this.text(reasonInput,2000),ctx=this.context();
    return this.tx.run(async ex=>{
      const original=await this.repo.journalById(ex,id,true);if(!original)throw new DomainError('FINANCE_JOURNAL_NOT_FOUND','سند مالی پیدا نشد.');
      if(String(original.status)!=='posted')throw new DomainError('FINANCE_JOURNAL_NOT_POSTED','فقط سند ثبت‌شده قابل برگشت است.');
      if(await this.repo.reversalFor(ex,id))throw new DomainError('FINANCE_JOURNAL_ALREADY_REVERSED','برای این سند قبلاً سند برگشت ثبت شده است.');
      const lines=await this.repo.journalLines(ex,id);
      const reversalId=randomUUID(),entryNumber=this.number();
      await this.repo.createJournal(ex,{id:reversalId,entryNumber,description:`برگشت سند ${String(original.entry_number)} — ${reason}`,occurredAt:new Date(),status:'draft',reversalOfId:id,sourceType:'journal_reversal',sourceId:id,createdBy:ctx.actor.id});
      for(const l of lines)await this.repo.createJournalLine(ex,{id:randomUUID(),journalId:reversalId,accountId:String(l.account_id),debitToman:Number(l.credit_toman),creditToman:Number(l.debit_toman),description:l.description?String(l.description):null});
      const postedReversal=await this.repo.postJournal(ex,reversalId,ctx.actor.id);if(!postedReversal)throw new DomainError('FINANCE_JOURNAL_REVERSAL_POST_FAILED','ثبت سند برگشت ناموفق بود.');
      const reversed=await this.repo.markReversed(ex,id,ctx.actor.id);if(!reversed)throw new DomainError('FINANCE_JOURNAL_STATE_CHANGED','وضعیت سند هم‌زمان تغییر کرده است.');
      const reversal=await this.repo.journalView(ex,reversalId);
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.journal.reverse',resourceType:'finance_journal',resourceId:id,beforeData:original,afterData:{original:reversed,reversal},reason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[
        financeEvent('finance.journal.reversal_posted.v1','finance_journal',reversalId,1,{journal_id:reversalId,entry_number:entryNumber,reversal_of_id:id,reason}),
        financeEvent('finance.journal.reversed.v1','finance_journal',id,Number(reversed.version),{journal_id:id,entry_number:String(original.entry_number),reversal_journal_id:reversalId,reason})
      ],ctx);
      return{original:await this.repo.journalView(ex,id),reversal};
    });
  }
}
