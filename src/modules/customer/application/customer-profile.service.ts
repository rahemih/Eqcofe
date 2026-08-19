import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { customerEvent } from '../domain/customer.events';
import { CustomerProfileRow,CustomerRepository } from '../infrastructure/customer.repository';

export interface CustomerProfileUpdateInput{
  first_name?:unknown;
  last_name?:unknown;
  email?:unknown;
}

@Injectable()
export class CustomerProfileService{
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:CustomerRepository,
    private readonly ctx:RequestContextStore,
    private readonly outbox:OutboxWriter,
    private readonly audit:AuditWriter,
  ){}

  private customerId():string{
    const actor=this.ctx.get()?.actor;
    if(actor?.type!=='customer'||!actor.id)throw new DomainError('CUSTOMER_REQUIRED','ورود مشتری الزامی است.');
    return actor.id;
  }

  private normalizeName(value:unknown,max:number):string|null{
    if(value===undefined)throw new DomainError('PROFILE_FIELD_MISSING','فیلد پروفایل برای این عملیات مشخص نشده است.');
    if(value===null)return null;
    const normalized=String(value).trim().replace(/\s+/g,' ');
    if(!normalized)return null;
    if(normalized.length>max)throw new DomainError('VALIDATION_ERROR','طول نام واردشده معتبر نیست.');
    return normalized;
  }

  private normalizeEmail(value:unknown):string|null{
    if(value===undefined)throw new DomainError('PROFILE_FIELD_MISSING','ایمیل برای این عملیات مشخص نشده است.');
    if(value===null)return null;
    const normalized=String(value).trim().toLowerCase();
    if(!normalized)return null;
    if(normalized.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new DomainError('INVALID_EMAIL','ایمیل معتبر نیست.');
    return normalized;
  }

  private assertReadable(row:CustomerProfileRow|null):CustomerProfileRow{
    if(!row)throw new DomainError('CUSTOMER_NOT_FOUND','پروفایل مشتری پیدا نشد.');
    if(row.status!=='active')throw new DomainError('CUSTOMER_INACTIVE','پروفایل مشتری فعال نیست.');
    return row;
  }

  private present(row:CustomerProfileRow){
    return{
      id:String(row.id),
      customer_type:String(row.customer_type),
      first_name:row.first_name??null,
      last_name:row.last_name??null,
      mobile:row.mobile_normalized??null,
      email:row.email_normalized??null,
      status:String(row.status),
      created_at:row.created_at,
    };
  }

  async getProfile(){
    const customerId=this.customerId();
    return this.present(this.assertReadable(await this.repo.profileById(customerId)));
  }

  async updateProfile(input:CustomerProfileUpdateInput){
    const customerId=this.customerId();
    const allowed=new Set(['first_name','last_name','email']);
    const keys=Object.keys(input??{});
    if(keys.length===0)throw new DomainError('PROFILE_UPDATE_EMPTY','حداقل یک فیلد پروفایل باید تغییر کند.');
    if(keys.some(k=>!allowed.has(k)))throw new DomainError('PROFILE_FIELD_FORBIDDEN','تغییر این فیلد پروفایل مجاز نیست.');
    const context=this.ctx.require();

    return this.tx.run(async ex=>{
      const before=this.assertReadable(await this.repo.profileById(customerId,ex));
      const firstName=Object.prototype.hasOwnProperty.call(input,'first_name')?this.normalizeName(input.first_name,100):before.first_name;
      const lastName=Object.prototype.hasOwnProperty.call(input,'last_name')?this.normalizeName(input.last_name,100):before.last_name;
      const email=Object.prototype.hasOwnProperty.call(input,'email')?this.normalizeEmail(input.email):before.email_normalized;
      const changed:string[]=[];
      if(firstName!==before.first_name)changed.push('first_name');
      if(lastName!==before.last_name)changed.push('last_name');
      if(email!==before.email_normalized)changed.push('email');
      if(changed.length===0)return this.present(before);

      const expectedVersion=Number(before.version);
      if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)throw new DomainError('CUSTOMER_VERSION_INVALID','نسخه پروفایل مشتری معتبر نیست.');
      const updated=await this.repo.updateProfile(ex,{customerId,expectedVersion,firstName,lastName,emailNormalized:email});
      if(!updated)throw new DomainError('VERSION_CONFLICT','پروفایل همزمان تغییر کرده است؛ اطلاعات جدید را دریافت و دوباره تلاش کنید.');

      await this.outbox.append(ex,[customerEvent('customer.profile.updated.v1',customerId,Number(updated.version),{
        customer_id:customerId,changed_fields:changed,
      })],context);
      await this.audit.writeWith(ex,{
        actorType:'customer',actorId:customerId,action:'customer.profile.update',resourceType:'customer',resourceId:customerId,
        beforeData:{first_name:before.first_name,last_name:before.last_name,email:before.email_normalized,version:Number(before.version)},
        afterData:{first_name:updated.first_name,last_name:updated.last_name,email:updated.email_normalized,version:Number(updated.version)},
        requestId:context.requestId,traceId:context.traceId,
      });
      return this.present(updated);
    });
  }
}
