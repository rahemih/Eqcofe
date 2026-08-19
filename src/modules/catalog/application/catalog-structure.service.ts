import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { DomainError } from '../../../shared/errors/domain-error';
import { requiredText } from '../domain/catalog.validation';
import { CatalogRepository } from '../infrastructure/catalog.repository';

function versionFrom(value: string | undefined): number {
  const n = Number(String(value ?? '').replaceAll('"', ''));
  if (!Number.isInteger(n) || n < 1) throw new DomainError('PRECONDITION_REQUIRED', 'If-Match معتبر الزامی است.');
  return n;
}
function attributeValueInput(i: any) {
  let kind = 0;
  if (i.value_text != null) kind++;
  if (i.value_numeric != null) kind++;
  if (i.value_boolean != null) kind++;
  if (kind !== 1) throw new DomainError('VALIDATION_ERROR', 'دقیقاً یک مقدار ویژگی باید تعیین شود.');
  return { valueText:i.value_text??null, valueNumeric:i.value_numeric??null, valueBoolean:i.value_boolean??null, normalizedValue:i.normalized_value??null, sortOrder:Number.isInteger(i.sort_order)?i.sort_order:0 };
}
function assignmentItems(items:any[]) {
  if (!Array.isArray(items)) throw new DomainError('VALIDATION_ERROR','values باید آرایه باشد.');
  const normalized=items.map(x=>({attributeId:String(x.attribute_id??''),attributeValueId:String(x.attribute_value_id??'')}));
  if(normalized.some(x=>!x.attributeId||!x.attributeValueId))throw new DomainError('VALIDATION_ERROR','شناسه ویژگی و مقدار آن الزامی است.');
  if(new Set(normalized.map(x=>x.attributeId)).size!==normalized.length)throw new DomainError('VALIDATION_ERROR','هر ویژگی فقط یک بار قابل تخصیص است.');
  return normalized;
}
@Injectable()
export class CatalogStructureService {
  constructor(private tx:TransactionManager,private repo:CatalogRepository,private audit:AuditWriter,private ctx:RequestContextStore){}
  async createAttribute(i:any){
    const dataType=String(i.data_type??''); if(!['text','number','boolean','select'].includes(dataType)) throw new DomainError('VALIDATION_ERROR','نوع ویژگی معتبر نیست.');
    const v={id:randomUUID(),categoryId:i.category_id??null,nameFa:requiredText(i.name_fa,'name_fa',150),key:requiredText(i.key,'key',120),dataType,unit:i.unit??null,isVariant:!!i.is_variant_attribute,isFilterable:!!i.is_filterable,isComparable:!!i.is_comparable,sortOrder:Number.isInteger(i.sort_order)?i.sort_order:0};
    const c=this.ctx.require(); await this.tx.run(async trx=>{await this.repo.createAttribute(trx,v);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.attribute.create',resourceType:'attribute',resourceId:v.id,afterData:v,requestId:c.requestId});}); return {...v,version:1};
  }
  listAttributes(categoryId?:string){return this.repo.listAttributes(categoryId);}
  async updateAttribute(id:string,i:any,ifMatch?:string){const expected=versionFrom(ifMatch),c=this.ctx.require();await this.tx.run(async trx=>{const current=await this.repo.attributeById(trx,id,true);if(!current)throw new DomainError('ATTRIBUTE_NOT_FOUND','ویژگی پیدا نشد.');const dataType=String(i.data_type??current.data_type);if(!['text','number','boolean','select'].includes(dataType))throw new DomainError('VALIDATION_ERROR','نوع ویژگی معتبر نیست.');await this.repo.updateAttribute(trx,id,{categoryId:Object.prototype.hasOwnProperty.call(i,'category_id')?i.category_id:current.category_id,nameFa:i.name_fa?requiredText(i.name_fa,'name_fa',150):current.name_fa,key:i.key?requiredText(i.key,'key',120):current.key,dataType,unit:Object.prototype.hasOwnProperty.call(i,'unit')?i.unit:current.unit,isVariant:i.is_variant_attribute??current.is_variant_attribute,isFilterable:i.is_filterable??current.is_filterable,isComparable:i.is_comparable??current.is_comparable,sortOrder:Number.isInteger(i.sort_order)?i.sort_order:current.sort_order},expected);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.attribute.update',resourceType:'attribute',resourceId:id,beforeData:current,afterData:i,requestId:c.requestId});});return this.repo.getAttribute(id);}
  async createValue(attributeId:string,i:any){const c=this.ctx.require(),value=attributeValueInput(i),id=randomUUID();await this.tx.run(async trx=>{if(!await this.repo.attributeById(trx,attributeId))throw new DomainError('ATTRIBUTE_NOT_FOUND','ویژگی پیدا نشد.');await this.repo.createAttributeValue(trx,{id,attributeId,...value});await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.attribute-value.create',resourceType:'attribute_value',resourceId:id,requestId:c.requestId});});return{id,attribute_id:attributeId,...i,version:1};}
  values(attributeId:string){return this.repo.listAttributeValues(attributeId);}
  async updateValue(id:string,i:any,ifMatch?:string){const expected=versionFrom(ifMatch),c=this.ctx.require(),value=attributeValueInput(i);await this.tx.run(async trx=>{const current=await this.repo.attributeValueById(trx,id,true);if(!current)throw new DomainError('ATTRIBUTE_VALUE_NOT_FOUND','مقدار ویژگی پیدا نشد.');await this.repo.updateAttributeValue(trx,id,value,expected);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.attribute-value.update',resourceType:'attribute_value',resourceId:id,beforeData:current,afterData:i,requestId:c.requestId});});return{id,...i,version:expected+1};}
  async setProductAttributes(productId:string,items:any[]){const values=assignmentItems(items),c=this.ctx.require();await this.tx.run(async trx=>{await this.repo.setProductAttributes(trx,productId,values);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.product-attributes.set',resourceType:'product',resourceId:productId,afterData:{values},requestId:c.requestId});});return this.repo.productAttributes(productId);}
  productAttributes(productId:string){return this.repo.productAttributes(productId);}
  async setVariantAttributes(variantId:string,items:any[]){const values=assignmentItems(items),c=this.ctx.require();await this.tx.run(async trx=>{await this.repo.setVariantAttributes(trx,variantId,values);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.variant-attributes.set',resourceType:'variant',resourceId:variantId,afterData:{values},requestId:c.requestId});});return this.repo.variantAttributes(variantId);}
  variantAttributes(variantId:string){return this.repo.variantAttributes(variantId);}
  async attachMedia(productId:string,i:any){const c=this.ctx.require();const mediaType=String(i.media_type??'image');if(!['image','video','document'].includes(mediaType))throw new DomainError('VALIDATION_ERROR','نوع رسانه معتبر نیست.');await this.tx.run(async trx=>{await this.repo.attachProductMedia(trx,{id:randomUUID(),productId,variantId:i.variant_id??null,mediaId:String(i.media_id),mediaType,sortOrder:Number.isInteger(i.sort_order)?i.sort_order:0,isPrimary:!!i.is_primary,altText:i.alt_text_fa??null});await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.product-media.attach',resourceType:'product',resourceId:productId,afterData:i,requestId:c.requestId});});return this.repo.productMedia(productId);}
  productMedia(productId:string){return this.repo.productMedia(productId);}
  async detachMedia(productId:string,mediaId:string){const c=this.ctx.require();await this.tx.run(async trx=>{await this.repo.detachProductMedia(trx,productId,mediaId);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.product-media.detach',resourceType:'product',resourceId:productId,afterData:{media_id:mediaId},requestId:c.requestId});});return{detached:true};}
  async reorderMedia(productId:string,items:any[]){const c=this.ctx.require();if(!Array.isArray(items)||new Set(items.map(x=>x.media_id)).size!==items.length)throw new DomainError('VALIDATION_ERROR','لیست مرتب‌سازی رسانه معتبر نیست.');await this.tx.run(async trx=>{await this.repo.reorderProductMedia(trx,productId,items);await this.audit.writeWith(trx,{actorType:c.actor.type,actorId:c.actor.id,action:'catalog.product-media.reorder',resourceType:'product',resourceId:productId,afterData:{items},requestId:c.requestId});});return this.repo.productMedia(productId);}
}
