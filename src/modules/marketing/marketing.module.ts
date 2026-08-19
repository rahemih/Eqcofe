import { Module } from '@nestjs/common';
import { CampaignService } from './application/campaign.service';
import { CouponEligibilityService } from './application/coupon-eligibility.service';
import { AutomaticPromotionService } from './application/automatic-promotion.service';
import { CheckoutPromotionService } from './application/checkout-promotion.service';
import { CampaignRepository } from './infrastructure/campaign.repository';
import { CouponEligibilityRepository } from './infrastructure/coupon-eligibility.repository';
import { AutomaticPromotionRepository } from './infrastructure/automatic-promotion.repository';

@Module({
  providers: [CampaignService, CampaignRepository, CouponEligibilityService, CouponEligibilityRepository, AutomaticPromotionService, AutomaticPromotionRepository, CheckoutPromotionService],
  exports: [CampaignService, CouponEligibilityService, AutomaticPromotionService, CheckoutPromotionService],
})
export class MarketingModule {}
