import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { PricingQueryService } from '../../pricing/application/pricing-query.service';
import { PhysicalSaleRepository } from '../infrastructure/physical-sale.repository';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PosPricingSnapshotService {
  constructor(private readonly tx:TransactionManager,private readonly repo:PhysicalSaleRepository,private readonly pricing:PricingQueryService){}

  async priceDraft(input:{saleId:unknown;staffActorId:unknown;customerType?:'retail'|'wholesale'}){
    const saleId=this.uuid(input.saleId,'POS_SALE_ID_INVALID');
    const staffActorId=this.uuid(input.staffActorId,'POS_STAFF_ACTOR_ID_INVALID');
    const customerType=input.customerType??'retail';
    if(!['retail','wholesale'].includes(customerType))throw new DomainError('POS_CUSTOMER_TYPE_INVALID','نوع قیمت‌گذاری فروش حضوری معتبر نیست.');

    const snapshotSource=await this.tx.run(async ex=>{
      const sale=await this.repo.byId(saleId,ex,true);
      if(!sale||sale.staff_actor_id!==staffActorId)throw new DomainError('POS_SALE_NOT_FOUND','فروش فیزیکی پیدا نشد.');
      if(sale.status!=='draft')throw new DomainError('POS_SALE_NOT_EDITABLE','فروش فیزیکی در وضعیت قابل قیمت‌گذاری نیست.');
      const lines=await this.repo.linesForUpdate(ex,saleId);
      if(!lines.length)throw new DomainError('POS_SALE_EMPTY','فروش فیزیکی بدون قلم قابل قیمت‌گذاری نیست.');
      return lines.map((line:any)=>({id:String(line.id),variantId:String(line.variant_id),quantity:Number(line.quantity)}));
    });

    const quoted=[] as any[];
    for(const line of snapshotSource){
      const quote=await this.pricing.quoteVariant({variantId:line.variantId,quantity:line.quantity,customerType});
      if(!quote)throw new DomainError('POS_PRICE_UNAVAILABLE','قیمت معتبر برای یکی از اقلام فروش حضوری موجود نیست.',{variant_id:line.variantId});
      const base=Number(quote.base_price_toman),discount=Number(quote.discount_toman),unit=Number(quote.current_toman);
      if(![base,discount,unit].every(Number.isSafeInteger)||base<0||discount<0||unit<0||base-discount!==unit)throw new DomainError('POS_PRICE_INVALID','خروجی قیمت‌گذاری فروش حضوری معتبر نیست.');
      quoted.push({...line,base,discount,unit,basePriceId:String(quote.base_price_id),ruleIds:(quote.applied_rule_ids??[]).map(String)});
    }

    return this.tx.run(async ex=>{
      const sale=await this.repo.byId(saleId,ex,true);
      if(!sale||sale.staff_actor_id!==staffActorId||sale.status!=='draft')throw new DomainError('POS_SALE_CHANGED','فروش فیزیکی همزمان تغییر کرده است.');
      const current=await this.repo.linesForUpdate(ex,saleId);
      const fingerprint=current.map((x:any)=>`${x.id}:${x.variant_id}:${x.quantity}`).join('|');
      const quotedFingerprint=quoted.map(x=>`${x.id}:${x.variantId}:${x.quantity}`).join('|');
      if(fingerprint!==quotedFingerprint)throw new DomainError('POS_SALE_CHANGED','اقلام فروش فیزیکی همزمان تغییر کرده‌اند.');
      let subtotal=0,discountTotal=0,total=0;
      for(const line of quoted){
        await this.repo.applyPriceSnapshot(ex,{lineId:line.id,basePriceToman:line.base,discountToman:line.discount,unitPriceToman:line.unit,basePriceId:line.basePriceId,ruleIds:line.ruleIds,customerType});
        subtotal+=line.base*line.quantity;discountTotal+=line.discount*line.quantity;total+=line.unit*line.quantity;
      }
      if(![subtotal,discountTotal,total].every(Number.isSafeInteger)||subtotal-discountTotal!==total)throw new DomainError('POS_TOTAL_INVALID','جمع فروش حضوری معتبر نیست.');
      const saved=await this.repo.updateTotals(ex,saleId,subtotal,discountTotal,total);
      if(!saved)throw new DomainError('POS_SALE_CHANGED','فروش فیزیکی دیگر قابل قیمت‌گذاری نیست.');
      return {sale_id:saleId,customer_type:customerType,subtotal_toman:subtotal,discount_total_toman:discountTotal,total_toman:total,lines:quoted.map(x=>({variant_id:x.variantId,quantity:x.quantity,unit_price_toman:x.unit,discount_toman:x.discount,base_price_toman:x.base,pricing_rule_ids:x.ruleIds}))};
    });
  }

  private uuid(value:unknown,code:string){const normalized=String(value??'').trim().toLowerCase();if(!UUID_RE.test(normalized))throw new DomainError(code,'شناسه فروش فیزیکی معتبر نیست.');return normalized;}
}
