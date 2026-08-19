import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { financeEvent } from '../domain/finance.events';

@Injectable()
export class ChartOfAccountsService{
  constructor(private readonly tx:TransactionManager,private readonly repo:FinanceRepository,private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,private readonly ctx:RequestContextStore){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private actorId(){return this.ctx.get()?.actor.id??null;}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number,required=true){const x=String(v??'').trim();if((required&&!x)||x.length>max)throw new DomainError('VALIDATION_ERROR','متن ورودی معتبر نیست.');return x;}

  list(){return this.repo.listAccounts();}
  async get(id:string){const x=await this.repo.accountById(this.repo.db(),this.uuid(id));if(!x)throw new DomainError('FINANCE_ACCOUNT_NOT_FOUND','حساب مالی پیدا نشد.');return x;}

  async create(input:{code:string;name_fa:string;account_type:string;normal_balance:string;parent_id?:string|null;system_key?:string|null;is_postable?:boolean}){
    const code=this.text(input?.code,40),nameFa=this.text(input?.name_fa,200),accountType=String(input?.account_type??''),normal=String(input?.normal_balance??'');
    if(!/^[A-Za-z0-9._-]{1,40}$/.test(code))throw new DomainError('FINANCE_ACCOUNT_CODE_INVALID','کد حساب معتبر نیست.');
    if(!['asset','liability','equity','revenue','expense','contra_asset','contra_revenue'].includes(accountType))throw new DomainError('FINANCE_ACCOUNT_TYPE_INVALID','نوع حساب معتبر نیست.');
    if(!['debit','credit'].includes(normal))throw new DomainError('FINANCE_NORMAL_BALANCE_INVALID','ماهیت حساب معتبر نیست.');
    const parentId=input.parent_id==null?null:this.uuid(input.parent_id),systemKey=input.system_key==null?null:this.text(input.system_key,80);
    const ctx=this.context(),id=randomUUID();
    return this.tx.run(async ex=>{
      if(await this.repo.accountByCode(ex,code))throw new DomainError('FINANCE_ACCOUNT_CODE_EXISTS','کد حساب تکراری است.');
      if(parentId&&!await this.repo.accountById(ex,parentId,true))throw new DomainError('FINANCE_PARENT_ACCOUNT_NOT_FOUND','حساب والد پیدا نشد.');
      const row=await this.repo.createAccount(ex,{id,code,nameFa,accountType,normalBalance:normal,parentId,systemKey,isPostable:input.is_postable!==false});
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.account.create',resourceType:'finance_account',resourceId:id,afterData:row,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.account.created.v1','finance_account',id,1,{account_id:id,code,name_fa:nameFa,account_type:accountType,normal_balance:normal,parent_id:parentId,is_postable:row.is_postable})],ctx);
      return row;
    });
  }

  async update(idInput:string,input:{name_fa?:string;parent_id?:string|null;is_postable?:boolean;is_active?:boolean}){
    const id=this.uuid(idInput),ctx=this.context();
    const patch:{nameFa?:string;parentId?:string|null;isPostable?:boolean;isActive?:boolean}={};
    if(input.name_fa!==undefined)patch.nameFa=this.text(input.name_fa,200);
    if(Object.prototype.hasOwnProperty.call(input,'parent_id'))patch.parentId=input.parent_id==null?null:this.uuid(input.parent_id);
    if(input.is_postable!==undefined)patch.isPostable=Boolean(input.is_postable);
    if(input.is_active!==undefined)patch.isActive=Boolean(input.is_active);
    if(Object.keys(patch).length===0)throw new DomainError('VALIDATION_ERROR','حداقل یک تغییر الزامی است.');
    return this.tx.run(async ex=>{
      const before=await this.repo.accountById(ex,id,true);if(!before)throw new DomainError('FINANCE_ACCOUNT_NOT_FOUND','حساب مالی پیدا نشد.');
      if(patch.parentId===id)throw new DomainError('FINANCE_ACCOUNT_PARENT_SELF','حساب نمی‌تواند والد خودش باشد.');
      if(patch.parentId&&!await this.repo.accountById(ex,patch.parentId,true))throw new DomainError('FINANCE_PARENT_ACCOUNT_NOT_FOUND','حساب والد پیدا نشد.');
      const row=await this.repo.updateAccount(ex,id,patch);if(!row)throw new DomainError('FINANCE_ACCOUNT_NOT_FOUND','حساب مالی پیدا نشد.');
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.account.update',resourceType:'finance_account',resourceId:id,beforeData:before,afterData:row,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.account.updated.v1','finance_account',id,Number(row.version),{account_id:id,name_fa:String(row.name_fa),parent_id:row.parent_id?String(row.parent_id):null,is_postable:Boolean(row.is_postable),is_active:Boolean(row.is_active)})],ctx);
      return row;
    });
  }
}
