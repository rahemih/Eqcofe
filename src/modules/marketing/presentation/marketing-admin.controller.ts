import { Body,Controller,Get,HttpCode,HttpStatus,Param,Post,Query } from '@nestjs/common';
import { Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { CampaignService } from '../application/campaign.service';
import { MarketingAdminService } from '../application/marketing-admin.service';

@Controller('admin/marketing')
@StaffOnly()
export class MarketingAdminController {
  constructor(private readonly campaigns:CampaignService,private readonly admin:MarketingAdminService){}

  @Permissions('marketing.view') @Get('campaigns') listCampaigns(@Query('status') status?:string){return this.campaigns.list(status);}
  @Permissions('marketing.view') @Get('campaigns/:id') getCampaign(@Param('id') id:string){return this.campaigns.get(id);}
  @Permissions('marketing.manage') @RequireIdempotency('marketing.campaign.create') @Post('campaigns') createCampaign(@Body() body:any){return this.campaigns.create(body??{});}
  @Permissions('marketing.manage') @RequireIdempotency('marketing.campaign.reschedule') @HttpCode(HttpStatus.OK) @Post('campaigns/:id/reschedule') rescheduleCampaign(@Param('id') id:string,@Body() body:any){return this.campaigns.reschedule(id,Number(body?.expected_version),body??{});}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.campaign.activate') @HttpCode(HttpStatus.OK) @Post('campaigns/:id/activate') activateCampaign(@Param('id') id:string,@Body() body:any){return this.campaigns.activate(id,Number(body?.expected_version));}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.campaign.pause') @HttpCode(HttpStatus.OK) @Post('campaigns/:id/pause') pauseCampaign(@Param('id') id:string,@Body() body:any){return this.campaigns.pause(id,Number(body?.expected_version));}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.campaign.end') @HttpCode(HttpStatus.OK) @Post('campaigns/:id/end') endCampaign(@Param('id') id:string,@Body() body:any){return this.campaigns.end(id,Number(body?.expected_version));}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.campaign.archive') @HttpCode(HttpStatus.OK) @Post('campaigns/:id/archive') archiveCampaign(@Param('id') id:string,@Body() body:any){return this.campaigns.archive(id,Number(body?.expected_version));}

  @Permissions('marketing.view') @Get('promotions') listPromotions(@Query('campaign_id') campaignId?:string){return this.admin.listPromotions(campaignId);}
  @Permissions('marketing.manage') @RequireIdempotency('marketing.promotion.create') @Post('promotions') createPromotion(@Body() body:any){return this.admin.createPromotion(body??{});}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.promotion.enable') @HttpCode(HttpStatus.OK) @Post('promotions/:id/enable') enablePromotion(@Param('id') id:string,@Body() body:any){return this.admin.setPromotionEnabled(id,Number(body?.expected_version),true);}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.promotion.disable') @HttpCode(HttpStatus.OK) @Post('promotions/:id/disable') disablePromotion(@Param('id') id:string,@Body() body:any){return this.admin.setPromotionEnabled(id,Number(body?.expected_version),false);}

  @Permissions('marketing.view') @Get('coupons') listCoupons(@Query('promotion_id') promotionId?:string){return this.admin.listCoupons(promotionId);}
  @Permissions('marketing.manage') @RequireIdempotency('marketing.coupon.create') @Post('coupons') createCoupon(@Body() body:any){return this.admin.createCoupon(body??{});}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.coupon.enable') @HttpCode(HttpStatus.OK) @Post('coupons/:id/enable') enableCoupon(@Param('id') id:string,@Body() body:any){return this.admin.setCouponEnabled(id,Number(body?.expected_version),true);}
  @Permissions('marketing.activate') @RequireStepUp() @RequireIdempotency('marketing.coupon.disable') @HttpCode(HttpStatus.OK) @Post('coupons/:id/disable') disableCoupon(@Param('id') id:string,@Body() body:any){return this.admin.setCouponEnabled(id,Number(body?.expected_version),false);}

  @Permissions('marketing.redemption.view') @Get('redemptions') listRedemptions(@Query('status') status?:string){return this.admin.listRedemptions(status);}
}
