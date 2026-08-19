import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { ProcurementRepository } from '../infrastructure/procurement.repository';

@Injectable()
export class SupplierService{
 constructor(private readonly tx:TransactionManager,private readonly repo:ProcurementRepository,private readonly audit:AuditWriter,private readonly ctx:RequestContextStore){}
 list(){return this.repo.suppliers();} get(id:string){return this.repo.supplier(id);}
 async create(input:{code:string;name_fa:string;legal_name?:string;national_id?:string;mobile?:string;phone?:string;email?:string;payment_terms_days?:number;notes?:string}){
  if(!String(input.code??'').trim()||!String(input.name_fa??'').trim())throw new DomainError('VALIDATION_ERROR','کد و نام تامین‌کننده الزامی است.'); const terms=input.payment_terms_days??0;if(!Number.isSafeInteger(terms)||terms<0)throw new DomainError('VALIDATION_ERROR','مهلت پرداخت نامعتبر است.'); const c=this.ctx.require(),id=randomUUID();
  await this.tx.run(async trx=>{await this.repo.createSupplier(trx,{id,...input,payment_terms_days:terms});await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'procurement.supplier.create',resourceType:'supplier',resourceId:id,afterData:input,requestId:c.requestId,traceId:c.traceId});}); return this.repo.supplier(id);
 }
 async update(id:string,input:Record<string,unknown>,expected:number){if(!Object.values(input).some(v=>v!==undefined))throw new DomainError('VALIDATION_ERROR','حداقل یک تغییر الزامی است.');const c=this.ctx.require();await this.tx.run(async trx=>{const before=await this.repo.supplierForUpdate(trx,id);if(!before)throw new DomainError('SUPPLIER_NOT_FOUND','تامین‌کننده پیدا نشد.');await this.repo.updateSupplier(trx,id,input,expected);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'procurement.supplier.update',resourceType:'supplier',resourceId:id,beforeData:before,afterData:input,requestId:c.requestId,traceId:c.traceId});});return this.repo.supplier(id);}
 async setStatus(id:string,status:'active'|'inactive',expected:number){const c=this.ctx.require();await this.tx.run(async trx=>{const before=await this.repo.supplierForUpdate(trx,id);if(!before)throw new DomainError('SUPPLIER_NOT_FOUND','تامین‌کننده پیدا نشد.');await this.repo.setSupplierStatus(trx,id,status,expected);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:`procurement.supplier.${status}`,resourceType:'supplier',resourceId:id,beforeData:before,afterData:{status},requestId:c.requestId,traceId:c.traceId});});return this.repo.supplier(id);}
}
