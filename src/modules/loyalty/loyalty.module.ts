import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { PointsService } from './application/points.service';
import { LoyaltyAdminService } from './application/loyalty-admin.service';
import { PointsRepository } from './infrastructure/points.repository';
import { LoyaltyAdminController } from './presentation/loyalty-admin.controller';

@Module({
  imports:[CustomerModule],
  controllers:[LoyaltyAdminController],
  providers:[PointsRepository,PointsService,LoyaltyAdminService],
  exports:[PointsService,LoyaltyAdminService],
})
export class LoyaltyModule {}
