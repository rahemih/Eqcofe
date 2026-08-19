import { Module } from '@nestjs/common';
import { CampaignService } from './application/campaign.service';
import { CouponEligibilityService } from './application/coupon-eligibility.service';
import { CampaignRepository } from './infrastructure/campaign.repository';
import { CouponEligibilityRepository } from './infrastructure/coupon-eligibility.repository';

@Module({
  providers: [CampaignService, CampaignRepository, CouponEligibilityService, CouponEligibilityRepository],
  exports: [CampaignService, CouponEligibilityService],
})
export class MarketingModule {}
