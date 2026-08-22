import { Module } from '@nestjs/common';
import { CampaignService } from './application/campaign.service';
import { CouponEligibilityService } from './application/coupon-eligibility.service';
import { AutomaticPromotionService } from './application/automatic-promotion.service';
import { CheckoutPromotionService } from './application/checkout-promotion.service';
import { MarketingAdminService } from './application/marketing-admin.service';
import { CampaignRepository } from './infrastructure/campaign.repository';
import { CouponEligibilityRepository } from './infrastructure/coupon-eligibility.repository';
import { AutomaticPromotionRepository } from './infrastructure/automatic-promotion.repository';
import { MarketingAdminRepository } from './infrastructure/marketing-admin.repository';
import { MarketingAdminController } from './presentation/marketing-admin.controller';

@Module({
  controllers:[MarketingAdminController],
  providers: [CampaignService, CampaignRepository, CouponEligibilityService, CouponEligibilityRepository, AutomaticPromotionService, AutomaticPromotionRepository, CheckoutPromotionService, MarketingAdminService, MarketingAdminRepository],
  exports: [CampaignService, CouponEligibilityService, AutomaticPromotionService, CheckoutPromotionService, MarketingAdminService],
})
export class MarketingModule {}
