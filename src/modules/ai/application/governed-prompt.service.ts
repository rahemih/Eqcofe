import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { AiOperationKind } from '../domain/ai-provider-contracts';
import { createGovernedPromptVersion, normalizePromptKey } from '../domain/governed-prompt';
import { GovernedPromptRepository, PromptDefinitionRow } from '../infrastructure/governed-prompt.repository';

@Injectable()
export class GovernedPromptService {
  constructor(private readonly tx:TransactionManager,private readonly repo:GovernedPromptRepository,private readonly ctx:RequestContextStore){}

  private staff():string{const a=this.ctx.get()?.actor;if(a?.type!=='staff'||!a.id)throw new DomainError('STAFF_REQUIRED','دسترسی کارشناس برای مدیریت پرامپت الزامی است.');return a.id;}
  private aggregateVersion(row:PromptDefinitionRow):number{const n=Number(row.version);if(!Number.isSafeInteger(n)||n<1)throw new DomainError('AI_PROMPT_AGGREGATE_VERSION_INVALID','نسخه مدیریتی پرامپت معتبر نیست.');return n;}
  private operation(value:unknown):AiOperationKind{if(value!=='product_qa'&&value!=='draft_content')throw new DomainError('AI_PROMPT_OPERATION_INVALID','کاربرد پرامپت معتبر نیست.');return value;}

  async create(input:{key:unknown;operation:unknown;template:unknown}){
    const staffId=this.staff(),key=normalizePromptKey(input.key),operation=this.operation(input.operation);
    return this.tx.run(async ex=>{
      if(await this.repo.byKey(key,ex,true))throw new DomainError('AI_PROMPT_KEY_EXISTS','این کلید پرامپت قبلاً ثبت شده است.');
      const definition=await this.repo.createDefinition(ex,{id:randomUUID(),key,operation,staffId});
      const model=createGovernedPromptVersion({promptKey:key,operation,version:1,template:input.template});
      const version=await this.repo.addVersion(ex,{id:randomUUID(),promptId:definition.id,version:model.version,template:model.template,staffId});
      return {definition,version};
    });
  }

  async addVersion(keyRaw:unknown,template:unknown){
    const staffId=this.staff(),key=normalizePromptKey(keyRaw);
    return this.tx.run(async ex=>{
      const definition=await this.repo.byKey(key,ex,true);if(!definition)throw new DomainError('AI_PROMPT_NOT_FOUND','پرامپت پیدا نشد.');
      const next=await this.repo.nextVersion(definition.id,ex);
      const model=createGovernedPromptVersion({promptKey:key,operation:definition.operation,version:next,template});
      return this.repo.addVersion(ex,{id:randomUUID(),promptId:definition.id,version:model.version,template:model.template,staffId});
    });
  }

  async activate(keyRaw:unknown,versionNumber:unknown){
    const staffId=this.staff(),key=normalizePromptKey(keyRaw),v=Number(versionNumber);
    if(!Number.isSafeInteger(v)||v<1)throw new DomainError('AI_PROMPT_VERSION_INVALID','نسخه پرامپت معتبر نیست.');
    return this.tx.run(async ex=>{
      const definition=await this.repo.byKey(key,ex,true);if(!definition)throw new DomainError('AI_PROMPT_NOT_FOUND','پرامپت پیدا نشد.');
      if(!await this.repo.version(definition.id,v,ex))throw new DomainError('AI_PROMPT_VERSION_NOT_FOUND','نسخه پرامپت پیدا نشد.');
      const updated=await this.repo.activate(ex,{id:definition.id,expectedVersion:this.aggregateVersion(definition),activeVersion:v,staffId});
      if(!updated)throw new DomainError('VERSION_CONFLICT','پرامپت همزمان تغییر کرده است.'); return updated;
    });
  }

  async disable(keyRaw:unknown){
    const staffId=this.staff(),key=normalizePromptKey(keyRaw);
    return this.tx.run(async ex=>{
      const definition=await this.repo.byKey(key,ex,true);if(!definition)throw new DomainError('AI_PROMPT_NOT_FOUND','پرامپت پیدا نشد.');
      if(definition.status==='disabled')return definition;
      const updated=await this.repo.disable(ex,{id:definition.id,expectedVersion:this.aggregateVersion(definition),staffId});
      if(!updated)throw new DomainError('VERSION_CONFLICT','پرامپت همزمان تغییر کرده است.'); return updated;
    });
  }

  async resolve(keyRaw:unknown,operationRaw:unknown){
    const key=normalizePromptKey(keyRaw),operation=this.operation(operationRaw);
    const resolved=await this.repo.resolveActive(key,operation);
    if(!resolved)throw new DomainError('AI_PROMPT_ACTIVE_VERSION_NOT_FOUND','نسخه فعال پرامپت پیدا نشد.');
    return {key:resolved.definition.prompt_key,operation:resolved.definition.operation,version:resolved.version.version_number,template:resolved.version.template};
  }
}
