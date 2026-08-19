import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { CouponEntity } from '../domain/coupon.entity';
import { evaluatePromotion } from '../domain/promotion-policy';
import { CouponEligibilityRepository } from '../infrastructure/coupon-eligibility.repository';

const CODE=/^[A-Z0-9][A-Z0-9_-]{2,31}$/;

@Injectable()
export class CouponEligibilityService {
  constructor(private readonly repo: CouponEligibilityRepository) {}

  async evaluate(input: { code: string; customerId: string | null; subtotalToman: number; isWholesale: boolean; hasCompletedPurchase: boolean; now?: Date }) {
    const code=String(input.code??'').trim().toUpperCase();
    if(!CODE.test(code)) throw new DomainError('COUPON_INVALID','کد تخفیف معتبر نیست.');
    if(!Number.isSafeInteger(input.subtotalToman)||input.subtotalToman<0) throw new DomainError('PROMOTION_INVALID_TOMAN','جمع سبد باید عدد صحیح نامنفی بر حسب تومان باشد.');
    const now=input.now??new Date();
    if(!(now instanceof Date)||Number.isNaN(now.getTime())) throw new DomainError('VALIDATION_ERROR','زمان ارزیابی معتبر نیست.');
    const row=await this.repo.byCode(code);
    if(!row) throw new DomainError('COUPON_NOT_FOUND','کد تخفیف پیدا نشد.');
    if(row.campaign_status!=='active'||now<new Date(row.campaign_starts_at)||now>=new Date(row.campaign_ends_at)) throw new DomainError('CAMPAIGN_NOT_ACTIVE','کمپین این کد فعال نیست.');
    if(!row.promotion_enabled) throw new DomainError('PROMOTION_DISABLED','تخفیف غیرفعال است.');

    const usage=await this.repo.usage({couponId:row.coupon_id,promotionId:row.promotion_id,customerId:input.customerId});
    const coupon=CouponEntity.create({
      id:row.coupon_id,promotionId:row.promotion_id,code:row.coupon_code,
      startsAt:new Date(row.coupon_starts_at),endsAt:new Date(row.coupon_ends_at),
      totalUsageLimit:row.coupon_total_usage_limit,perCustomerUsageLimit:row.coupon_per_customer_usage_limit,
    });
    if(!row.coupon_enabled) coupon.disable();
    coupon.assertUsable({now,customerId:input.customerId,totalRedemptions:usage.couponTotal,customerRedemptions:usage.couponCustomer});

    const result=evaluatePromotion({
      id:row.promotion_id,campaignId:row.campaign_id,name:row.promotion_name,
      kind:row.promotion_kind,value:Number(row.promotion_value),
      stacking:row.promotion_stacking,
      eligibility:{
        startsAt:new Date(row.promotion_starts_at),endsAt:new Date(row.promotion_ends_at),
        minimumSubtotalToman:row.promotion_min_subtotal_toman??undefined,
        firstPurchaseOnly:row.promotion_first_purchase_only,
        allowWholesale:row.promotion_wholesale_allowed,
        totalUsageLimit:row.promotion_total_usage_limit??undefined,
        perCustomerUsageLimit:row.promotion_per_customer_usage_limit??undefined,
      }
    },{
      now,subtotalToman:input.subtotalToman,customerId:input.customerId,
      isWholesale:input.isWholesale,hasCompletedPurchase:input.hasCompletedPurchase,
      totalRedemptions:usage.promotionTotal,customerRedemptions:usage.promotionCustomer,
    });
    if(!result.eligible) throw new DomainError(`PROMOTION_${result.reason}`,'این کد تخفیف برای این سفارش قابل استفاده نیست.',{reason:result.reason});
    const capped=row.promotion_max_discount_toman===null?result.discountToman:Math.min(result.discountToman,Number(row.promotion_max_discount_toman));
    return {couponId:row.coupon_id,promotionId:row.promotion_id,campaignId:row.campaign_id,code:row.coupon_code,discountToman:capped,stacking:row.promotion_stacking};
  }
}
