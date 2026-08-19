import { Module } from '@nestjs/common';
import { CampaignService } from './application/campaign.service';
import { CampaignRepository } from './infrastructure/campaign.repository';

@Module({
  providers: [CampaignService, CampaignRepository],
  exports: [CampaignService],
})
export class MarketingModule {}
