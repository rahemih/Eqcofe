import { Inject,Injectable } from '@nestjs/common';
import { Kysely,sql } from 'kysely';
import { randomUUID } from 'node:crypto';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';

@Injectable()
export class ShippingAdminService{
 constructor(@Inject(KYSELY_DB)private readonly db:Kysely<DatabaseSchema>,private readonly tx:TransactionManager,private readonly audit:AuditWriter,private readonly ctx:RequestContextStore){}
 private present(r:any){return{id:String(r.id),code:String(r.code),name_fa:String(r.name_fa),fee_toman:Number(r.fee_toman),active:Boolean(r.active),version:Number(r.version)};}
 async list(){return (await sql<any>`SELECT id,code,name_fa,fee_toman,active,version FROM cart.shipping_methods ORDER BY code`.execute(this.db)).rows.map(r=>this.present(r));}
 async create(input:any){const code=String(input?.code??'').trim().toLowerCase(),name=String(input?.name_fa??'').trim(),fee=Number(input?.fee_toman);if(!/^[a-z0-9][a-z0-9_-]{1,49}$/.test(code)||name.length<2||!Number.isSafeInteger(fee)||fee<0)throw new DomainError('VALIDATION_ERROR','اطلاعات روش ارسال معتبر نیست.');const id=randomUUID(),c=this.ctx.require();return this.tx.run(async ex=>{await sql`INSERT INTO cart.shipping_methods(id,code,name_fa,fee_toman,active) VALUES(${id}::uuid,${code},${name},${fee},${input.active!==false})`.execute(ex);await this.audit.writeWith(ex,{actorType:c.actor.type,actorId:c.actor.id,action:'checkout.shipping_method.create',resourceType:'shipping_method',resourceId:id,afterData:{code,name_fa:name,fee_toman:fee,active:input.active!==false},requestId:c.requestId,traceId:c.traceId});return{id,code,name_fa:name,fee_toman:fee,active:input.active!==false,version:1};});}
 async update(id:string,input:any,expected:number){if(!Number.isSafeInteger(expected)||expected<1)throw new DomainError('IF_MATCH_REQUIRED','If-Match معتبر الزامی است.');const c=this.ctx.require();return this.tx.run(async ex=>{const r=await sql<any>`SELECT * FROM cart.shipping_methods WHERE id=${id}::uuid FOR UPDATE`.execute(ex);const before=r.rows[0];if(!before)throw new DomainError('SHIPPING_METHOD_NOT_FOUND','روش ارسال پیدا نشد.');if(Number(before.version)!==expected)throw new DomainError('VERSION_CONFLICT','نسخه روش ارسال تغییر کرده است.');const name=input.name_fa===undefined?before.name_fa:String(input.name_fa).trim(),fee=input.fee_toman===undefined?Number(before.fee_toman):Number(input.fee_toman),active=input.active===undefined?Boolean(before.active):Boolean(input.active);if(name.length<2||!Number.isSafeInteger(fee)||fee<0)throw new DomainError('VALIDATION_ERROR','اطلاعات روش ارسال معتبر نیست.');await sql`UPDATE cart.shipping_methods SET name_fa=${name},fee_toman=${fee},active=${active},version=version+1,updated_at=now() WHERE id=${id}::uuid`.execute(ex);await this.audit.writeWith(ex,{actorType:c.actor.type,actorId:c.actor.id,action:'checkout.shipping_method.update',resourceType:'shipping_method',resourceId:id,beforeData:before,afterData:{name_fa:name,fee_toman:fee,active},requestId:c.requestId,traceId:c.traceId});return{id,code:before.code,name_fa:name,fee_toman:fee,active,version:expected+1};});}
}
