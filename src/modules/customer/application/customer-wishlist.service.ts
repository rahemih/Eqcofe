import { Inject, Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { CATALOG_CUSTOMER_PORT, CatalogCustomerPort } from '../../catalog/application/ports/catalog-customer.port';
import { customerWishlistEvent } from '../domain/customer.events';
import { CustomerRepository } from '../infrastructure/customer.repository';

@Injectable()
export class CustomerWishlistService{
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:CustomerRepository,
    private readonly ctx:RequestContextStore,
    private readonly outbox:OutboxWriter,
    private readonly audit:AuditWriter,
    @Inject(CATALOG_CUSTOMER_PORT) private readonly catalog:CatalogCustomerPort,
  ){}

  private customerId():string{
    const actor=this.ctx.get()?.actor;
    if(actor?.type!=='customer'||!actor.id)throw new DomainError('CUSTOMER_REQUIRED','ورود مشتری الزامی است.');
    return actor.id;
  }
  private uuid(value:unknown):string{
    const v=String(value??'').trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))throw new DomainError('PRODUCT_ID_INVALID','شناسه محصول معتبر نیست.');
    return v;
  }
  private async assertCustomerActive(customerId:string){
    const customer=await this.repo.profileById(customerId);
    if(!customer||customer.status!=='active')throw new DomainError('CUSTOMER_INACTIVE','حساب مشتری فعال نیست.');
  }

  async list(){
    const customerId=this.customerId();
    await this.assertCustomerActive(customerId);
    const rows=await this.repo.listWishlist(customerId);
    return {items:rows.map(row=>({product_id:String(row.product_id),added_at:row.created_at}))};
  }

  async add(productIdRaw:string){
    const customerId=this.customerId(),productId=this.uuid(productIdRaw),context=this.ctx.require();
    await this.assertCustomerActive(customerId);
    if(!(await this.catalog.productExists(productId)))throw new DomainError('PRODUCT_NOT_FOUND','محصول پیدا نشد.');
    return this.tx.run(async ex=>{
      const row=await this.repo.addWishlistItem(ex,customerId,productId);
      if(!row)return {added:true,product_id:productId,already_present:true};
      await this.outbox.append(ex,[customerWishlistEvent('customer.wishlist.item_added.v1',customerId,productId)],context);
      await this.audit.writeWith(ex,{actorType:'customer',actorId:customerId,action:'customer.wishlist.add',resourceType:'product',resourceId:productId,afterData:{customer_id:customerId,product_id:productId},requestId:context.requestId,traceId:context.traceId});
      return {added:true,product_id:productId,already_present:false};
    });
  }

  async remove(productIdRaw:string){
    const customerId=this.customerId(),productId=this.uuid(productIdRaw),context=this.ctx.require();
    await this.assertCustomerActive(customerId);
    return this.tx.run(async ex=>{
      const removed=await this.repo.removeWishlistItem(ex,customerId,productId);
      if(!removed)return {removed:true,product_id:productId,already_absent:true};
      await this.outbox.append(ex,[customerWishlistEvent('customer.wishlist.item_removed.v1',customerId,productId)],context);
      await this.audit.writeWith(ex,{actorType:'customer',actorId:customerId,action:'customer.wishlist.remove',resourceType:'product',resourceId:productId,beforeData:{customer_id:customerId,product_id:productId},afterData:null,requestId:context.requestId,traceId:context.traceId});
      return {removed:true,product_id:productId,already_absent:false};
    });
  }
}
