import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { customerAddressEvent } from '../domain/customer.events';
import { CustomerAddressRow,CustomerRepository } from '../infrastructure/customer.repository';

export interface CustomerAddressInput{
  recipient_name?:unknown;
  recipient_mobile?:unknown;
  province_id?:unknown;
  city_id?:unknown;
  postal_code?:unknown;
  address_line?:unknown;
  building_no?:unknown;
  unit_no?:unknown;
  location_metadata?:unknown;
  is_default?:unknown;
}

@Injectable()
export class CustomerAddressService{
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
  private uuid(value:unknown,code='ADDRESS_INVALID'):string{
    const v=String(value??'').trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))throw new DomainError(code,'شناسه آدرس معتبر نیست.');
    return v;
  }
  private text(value:unknown,max:number,required=true):string|null{
    if(value===null||value===undefined){if(required)throw new DomainError('ADDRESS_INVALID','اطلاعات آدرس کامل نیست.');return null;}
    const v=String(value).trim().replace(/\s+/g,' ');
    if(!v){if(required)throw new DomainError('ADDRESS_INVALID','اطلاعات آدرس کامل نیست.');return null;}
    if(v.length>max)throw new DomainError('ADDRESS_INVALID','طول اطلاعات آدرس معتبر نیست.');
    return v;
  }
  private mobile(value:unknown):string{
    const v=String(value??'').trim();if(!/^09\d{9}$/.test(v))throw new DomainError('ADDRESS_INVALID','شماره همراه گیرنده معتبر نیست.');return v;
  }
  private postal(value:unknown):string{
    const v=String(value??'').trim();if(!/^\d{10}$/.test(v))throw new DomainError('ADDRESS_INVALID','کد پستی معتبر نیست.');return v;
  }
  private metadata(value:unknown):Record<string,unknown>{
    if(value===undefined||value===null)return {};
    if(typeof value!=='object'||Array.isArray(value))throw new DomainError('ADDRESS_INVALID','اطلاعات موقعیت آدرس معتبر نیست.');
    const json=JSON.stringify(value);if(json.length>4000)throw new DomainError('ADDRESS_INVALID','اطلاعات موقعیت آدرس بیش از حد مجاز است.');
    return value as Record<string,unknown>;
  }
  private bool(value:unknown):boolean{
    if(value===undefined)return false;if(typeof value!=='boolean')throw new DomainError('ADDRESS_INVALID','وضعیت پیش‌فرض آدرس معتبر نیست.');return value;
  }
  private async assertCustomerActive(customerId:string,ex:any):Promise<void>{
    const customer=await this.repo.profileById(customerId,ex);
    if(!customer||customer.status!=='active')throw new DomainError('CUSTOMER_INACTIVE','حساب مشتری فعال نیست.');
  }
  private present(row:CustomerAddressRow){return{
    id:String(row.id),recipient_name:row.recipient_name,recipient_mobile:row.recipient_mobile,
    province_id:String(row.province_id),city_id:String(row.city_id),postal_code:row.postal_code,address_line:row.address_line,
    building_no:row.building_no??null,unit_no:row.unit_no??null,location_metadata:row.location_metadata??{},
    is_default:Boolean(row.is_default_shipping),created_at:row.created_at,updated_at:row.updated_at,
  };}
  private required(input:CustomerAddressInput){return{
    recipientName:this.text(input.recipient_name,150,true)!,recipientMobile:this.mobile(input.recipient_mobile),
    provinceId:this.uuid(input.province_id),cityId:this.uuid(input.city_id),postalCode:this.postal(input.postal_code),
    addressLine:this.text(input.address_line,1000,true)!,buildingNo:this.text(input.building_no,30,false),unitNo:this.text(input.unit_no,30,false),
    locationMetadata:this.metadata(input.location_metadata),isDefault:this.bool(input.is_default),
  };}

  async list(){const customerId=this.customerId(),ex=this.repo.db();await this.assertCustomerActive(customerId,ex);return (await this.repo.listAddresses(customerId,ex)).map(x=>this.present(x));}
  async get(addressId:string){
    const customerId=this.customerId(),ex=this.repo.db();await this.assertCustomerActive(customerId,ex);
    const row=await this.repo.addressById(this.uuid(addressId),customerId,ex);
    if(!row)throw new DomainError('ADDRESS_NOT_FOUND','آدرس پیدا نشد.');return this.present(row);
  }

  async create(input:CustomerAddressInput){
    const customerId=this.customerId(),normalized=this.required(input),context=this.ctx.require();
    return this.tx.run(async ex=>{
      await this.assertCustomerActive(customerId,ex);
      if(normalized.isDefault)await this.repo.clearDefaultAddress(ex,customerId);
      const row=await this.repo.createAddress(ex,{customerId,...normalized});
      await this.outbox.append(ex,[customerAddressEvent('customer.address.created.v1',String(row.id),Number(row.version),{customer_id:customerId,address_id:String(row.id),is_default:Boolean(row.is_default_shipping)})],context);
      await this.audit.writeWith(ex,{actorType:'customer',actorId:customerId,action:'customer.address.create',resourceType:'customer_address',resourceId:String(row.id),beforeData:null,afterData:{customer_id:customerId,is_default:Boolean(row.is_default_shipping)},requestId:context.requestId,traceId:context.traceId});
      return this.present(row);
    });
  }

  async update(addressId:string,input:CustomerAddressInput){
    const customerId=this.customerId(),id=this.uuid(addressId),allowed=new Set(['recipient_name','recipient_mobile','province_id','city_id','postal_code','address_line','building_no','unit_no','location_metadata']);
    const keys=Object.keys(input??{});if(keys.length===0)throw new DomainError('ADDRESS_UPDATE_EMPTY','حداقل یک فیلد آدرس باید تغییر کند.');
    if(keys.some(k=>!allowed.has(k)))throw new DomainError('ADDRESS_FIELD_FORBIDDEN','تغییر این فیلد آدرس از این عملیات مجاز نیست.');
    const context=this.ctx.require();
    return this.tx.run(async ex=>{
      await this.assertCustomerActive(customerId,ex);
      const before=await this.repo.addressById(id,customerId,ex,true);if(!before)throw new DomainError('ADDRESS_NOT_FOUND','آدرس پیدا نشد.');
      const next={
        recipientName:Object.prototype.hasOwnProperty.call(input,'recipient_name')?this.text(input.recipient_name,150,true)!:before.recipient_name,
        recipientMobile:Object.prototype.hasOwnProperty.call(input,'recipient_mobile')?this.mobile(input.recipient_mobile):before.recipient_mobile,
        provinceId:Object.prototype.hasOwnProperty.call(input,'province_id')?this.uuid(input.province_id):String(before.province_id),
        cityId:Object.prototype.hasOwnProperty.call(input,'city_id')?this.uuid(input.city_id):String(before.city_id),
        postalCode:Object.prototype.hasOwnProperty.call(input,'postal_code')?this.postal(input.postal_code):before.postal_code,
        addressLine:Object.prototype.hasOwnProperty.call(input,'address_line')?this.text(input.address_line,1000,true)!:before.address_line,
        buildingNo:Object.prototype.hasOwnProperty.call(input,'building_no')?this.text(input.building_no,30,false):before.building_no,
        unitNo:Object.prototype.hasOwnProperty.call(input,'unit_no')?this.text(input.unit_no,30,false):before.unit_no,
        locationMetadata:Object.prototype.hasOwnProperty.call(input,'location_metadata')?this.metadata(input.location_metadata):(before.location_metadata??{}),
      };
      const changed:string[]=[];
      const pairs:[string,unknown,unknown][]=[['recipient_name',before.recipient_name,next.recipientName],['recipient_mobile',before.recipient_mobile,next.recipientMobile],['province_id',String(before.province_id),next.provinceId],['city_id',String(before.city_id),next.cityId],['postal_code',before.postal_code,next.postalCode],['address_line',before.address_line,next.addressLine],['building_no',before.building_no,next.buildingNo],['unit_no',before.unit_no,next.unitNo],['location_metadata',JSON.stringify(before.location_metadata??{}),JSON.stringify(next.locationMetadata)]];
      for(const [name,a,b] of pairs)if(a!==b)changed.push(name);if(changed.length===0)return this.present(before);
      const version=Number(before.version);if(!Number.isSafeInteger(version)||version<1)throw new DomainError('ADDRESS_VERSION_INVALID','نسخه آدرس معتبر نیست.');
      const row=await this.repo.updateAddress(ex,{id,customerId,expectedVersion:version,...next});if(!row)throw new DomainError('VERSION_CONFLICT','آدرس همزمان تغییر کرده است؛ دوباره تلاش کنید.');
      await this.outbox.append(ex,[customerAddressEvent('customer.address.updated.v1',id,Number(row.version),{customer_id:customerId,address_id:id,changed_fields:changed})],context);
      await this.audit.writeWith(ex,{actorType:'customer',actorId:customerId,action:'customer.address.update',resourceType:'customer_address',resourceId:id,beforeData:{version},afterData:{version:Number(row.version),changed_fields:changed},requestId:context.requestId,traceId:context.traceId});
      return this.present(row);
    });
  }

  async setDefault(addressId:string){
    const customerId=this.customerId(),id=this.uuid(addressId),context=this.ctx.require();
    return this.tx.run(async ex=>{
      await this.assertCustomerActive(customerId,ex);
      const before=await this.repo.addressById(id,customerId,ex,true);if(!before)throw new DomainError('ADDRESS_NOT_FOUND','آدرس پیدا نشد.');
      if(before.is_default_shipping)return this.present(before);
      await this.repo.clearDefaultAddress(ex,customerId,id);
      const row=await this.repo.markDefaultAddress(ex,id,customerId,Number(before.version));if(!row)throw new DomainError('VERSION_CONFLICT','آدرس همزمان تغییر کرده است؛ دوباره تلاش کنید.');
      await this.outbox.append(ex,[customerAddressEvent('customer.address.default_changed.v1',id,Number(row.version),{customer_id:customerId,address_id:id})],context);
      await this.audit.writeWith(ex,{actorType:'customer',actorId:customerId,action:'customer.address.default_change',resourceType:'customer_address',resourceId:id,beforeData:{is_default:false},afterData:{is_default:true},requestId:context.requestId,traceId:context.traceId});
      return this.present(row);
    });
  }

  async delete(addressId:string){
    const customerId=this.customerId(),id=this.uuid(addressId),context=this.ctx.require();
    return this.tx.run(async ex=>{
      await this.assertCustomerActive(customerId,ex);
      const before=await this.repo.addressById(id,customerId,ex,true);if(!before)throw new DomainError('ADDRESS_NOT_FOUND','آدرس پیدا نشد.');
      const deleted=await this.repo.deleteAddress(ex,id,customerId,Number(before.version));if(!deleted)throw new DomainError('VERSION_CONFLICT','آدرس همزمان تغییر کرده است؛ دوباره تلاش کنید.');
      await this.outbox.append(ex,[customerAddressEvent('customer.address.deleted.v1',id,Number(before.version)+1,{customer_id:customerId,address_id:id,was_default:Boolean(before.is_default_shipping)})],context);
      await this.audit.writeWith(ex,{actorType:'customer',actorId:customerId,action:'customer.address.delete',resourceType:'customer_address',resourceId:id,beforeData:{customer_id:customerId,is_default:Boolean(before.is_default_shipping),version:Number(before.version)},afterData:null,requestId:context.requestId,traceId:context.traceId});
      return{deleted:true,id};
    });
  }
}
