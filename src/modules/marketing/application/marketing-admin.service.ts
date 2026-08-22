import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { CouponEntity } from '../domain/coupon.entity';
import { validatePromotion } from '../domain/promotion-policy';
import { MarketingAdminRepository } from '../infrastructure/marketing-admin.repository';
import { CampaignRepository } from '../infrastructure/campaign.repository';

@Injectable()
export class MarketingAdminService {
  constructor(private readonly tx:TransactionManager,private readonly repo:MarketingAdminRepository,private readonly campaigns:CampaignRepository,private readonly ctx:RequestContextStore,private readonly audit:AuditWriter){}

  async listPromotions(campaignId?:string){this.staff();return {items:await this.repo.listPromotions(campaignId?this.uuid(campaignId):undefined)};}
  async listCoupons(promotionId?:string){this.staff();return {items:await this.repo.listCoupons(promotionId?this.uuid(promotionId):undefined)};}
  async listRedemptions(status?:string){this.staff();const s=status?String(status):undefined;if(s&&!['reserved','consumed','released','reversed'].includes(s))throw new DomainError('VALIDATION_ERROR','وضعیت Redemption معتبر نیست.');return {items:await this.repo.listRedemptions(s)};}

  async createPromotion(body:any){
    const actorId=this.staff(),id=randomUUID(),campaignId=this.uuid(body?.campaign_id),startsAt=this.date(body?.starts_at),endsAt=this.date(body?.ends_at);
    const definition=validatePromotion({id,campaignId,name:String(body?.name??''),kind:body?.kind,value:Number(body?.value),stacking:body?.stacking??'exclusive',eligibility:{startsAt,endsAt,minimumSubtotalToman:this.optionalNonNegativeInt(body?.min_subtotal_toman),firstPurchaseOnly:Boolean(body?.first_purchase_only),allowWholesale:Boolean(body?.wholesale_allowed),totalUsageLimit:this.optionalPositiveInt(body?.total_usage_limit),perCustomerUsageLimit:this.optionalPositiveInt(body?.per_customer_usage_limit)}} as any);
    const maxDiscountToman=this.optionalPositiveInt(body?.max_discount_toman);
    const request=this.ctx.require();
    return this.tx.run(async ex=>{
      const campaign=await this.campaigns.byId(campaignId,ex,true);if(!campaign)throw new DomainError('CAMPAIGN_NOT_FOUND','کمپین پیدا نشد.');
      if(startsAt<new Date(campaign.starts_at)||endsAt>new Date(campaign.ends_at))throw new DomainError('PROMOTION_WINDOW_OUTSIDE_CAMPAIGN','بازه Promotion باید داخل بازه Campaign باشد.');
      const row=await this.repo.createPromotion(ex,{id,campaignId,name:definition.name,kind:definition.kind,value:definition.value,maxDiscountToman,minSubtotalToman:definition.eligibility.minimumSubtotalToman??null,firstPurchaseOnly:definition.eligibility.firstPurchaseOnly??false,wholesaleAllowed:definition.eligibility.allowWholesale??false,totalUsageLimit:definition.eligibility.totalUsageLimit??null,perCustomerUsageLimit:definition.eligibility.perCustomerUsageLimit??null,stacking:definition.stacking??'exclusive',startsAt,endsAt});
      await this.audit.writeWith(ex,{actorType:'staff',actorId,action:'marketing.promotion.create',resourceType:'marketing_promotion',resourceId:id,afterData:{campaign_id:campaignId,name:row.name,kind:row.kind,value:row.value,enabled:row.enabled},requestId:request.requestId,traceId:request.traceId});
      return row;
    });
  }

  async setPromotionEnabled(id:string,expectedVersion:number,enabled:boolean){
    const actorId=this.staff(),promotionId=this.uuid(id);this.version(expectedVersion);const request=this.ctx.require();
    return this.tx.run(async ex=>{const before=await this.repo.promotionById(promotionId,ex,true);if(!before)throw new DomainError('PROMOTION_NOT_FOUND','Promotion پیدا نشد.');if(Number(before.version)!==expectedVersion)throw new DomainError('PROMOTION_VERSION_CONFLICT','نسخه Promotion تغییر کرده است.');if(enabled&&new Date()>=new Date(before.ends_at))throw new DomainError('PROMOTION_EXPIRED','Promotion منقضی شده است.');const row=await this.repo.setPromotionEnabled(ex,promotionId,expectedVersion,enabled);if(!row)throw new DomainError('PROMOTION_VERSION_CONFLICT','تغییر همزمان مانع ذخیره شد.');await this.audit.writeWith(ex,{actorType:'staff',actorId,action:enabled?'marketing.promotion.enable':'marketing.promotion.disable',resourceType:'marketing_promotion',resourceId:promotionId,beforeData:{enabled:before.enabled,version:before.version},afterData:{enabled:row.enabled,version:row.version},requestId:request.requestId,traceId:request.traceId});return row;});
  }

  async createCoupon(body:any){
    const actorId=this.staff(),id=randomUUID(),promotionId=this.uuid(body?.promotion_id),startsAt=this.date(body?.starts_at),endsAt=this.date(body?.ends_at),request=this.ctx.require();
    const entity=CouponEntity.create({id,promotionId,code:String(body?.code??''),startsAt,endsAt,totalUsageLimit:this.optionalPositiveInt(body?.total_usage_limit),perCustomerUsageLimit:this.optionalPositiveInt(body?.per_customer_usage_limit)});const snap=entity.snapshot();
    return this.tx.run(async ex=>{const promotion=await this.repo.promotionById(promotionId,ex,true);if(!promotion)throw new DomainError('PROMOTION_NOT_FOUND','Promotion پیدا نشد.');if(startsAt<new Date(promotion.starts_at)||endsAt>new Date(promotion.ends_at))throw new DomainError('COUPON_WINDOW_OUTSIDE_PROMOTION','بازه Coupon باید داخل بازه Promotion باشد.');const row=await this.repo.createCoupon(ex,{id,promotionId,code:snap.code,startsAt,endsAt,totalUsageLimit:snap.totalUsageLimit,perCustomerUsageLimit:snap.perCustomerUsageLimit});await this.audit.writeWith(ex,{actorType:'staff',actorId,action:'marketing.coupon.create',resourceType:'marketing_coupon',resourceId:id,afterData:{promotion_id:promotionId,code:snap.code,enabled:true},requestId:request.requestId,traceId:request.traceId});return row;});
  }

  async setCouponEnabled(id:string,expectedVersion:number,enabled:boolean){
    const actorId=this.staff(),couponId=this.uuid(id);this.version(expectedVersion);const request=this.ctx.require();
    return this.tx.run(async ex=>{const before=await this.repo.couponById(couponId,ex,true);if(!before)throw new DomainError('COUPON_NOT_FOUND','Coupon پیدا نشد.');if(Number(before.version)!==expectedVersion)throw new DomainError('COUPON_VERSION_CONFLICT','نسخه Coupon تغییر کرده است.');if(enabled&&new Date()>=new Date(before.ends_at))throw new DomainError('COUPON_EXPIRED','Coupon منقضی شده است.');const row=await this.repo.setCouponEnabled(ex,couponId,expectedVersion,enabled);if(!row)throw new DomainError('COUPON_VERSION_CONFLICT','تغییر همزمان مانع ذخیره شد.');await this.audit.writeWith(ex,{actorType:'staff',actorId,action:enabled?'marketing.coupon.enable':'marketing.coupon.disable',resourceType:'marketing_coupon',resourceId:couponId,beforeData:{enabled:before.enabled,version:before.version},afterData:{enabled:row.enabled,version:row.version},requestId:request.requestId,traceId:request.traceId});return row;});
  }

  private staff(){const actor=this.ctx.get()?.actor;if(actor?.type!=='staff'||!actor.id)throw new DomainError('STAFF_REQUIRED','دسترسی مدیر الزامی است.');return actor.id;}
  private uuid(v:any){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private version(v:number){if(!Number.isSafeInteger(v)||v<1)throw new DomainError('VERSION_REQUIRED','نسخه معتبر الزامی است.');return v;}
  private date(v:any){const d=new Date(v);if(Number.isNaN(d.getTime()))throw new DomainError('VALIDATION_ERROR','تاریخ معتبر نیست.');return d;}
  private optionalPositiveInt(v:any){if(v===undefined||v===null||v==='')return null;const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw new DomainError('VALIDATION_ERROR','مقدار باید عدد صحیح مثبت باشد.');return n;}
  private optionalNonNegativeInt(v:any){if(v===undefined||v===null||v==='')return undefined;const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw new DomainError('VALIDATION_ERROR','مقدار باید عدد صحیح نامنفی باشد.');return n;}
}
