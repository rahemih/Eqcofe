import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { PointsService } from './application/points.service';
import { PointsRepository } from './infrastructure/points.repository';

@Module({
  imports:[CustomerModule],
  providers:[PointsRepository,PointsService],
  exports:[PointsService],
})
export class LoyaltyModule {}
