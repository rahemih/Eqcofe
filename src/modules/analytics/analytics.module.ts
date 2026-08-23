import { Module } from '@nestjs/common';
import { AnalyticsProjectionRepository } from './infrastructure/analytics-projection.repository';
import { AnalyticsProjectionService } from './application/analytics-projection.service';
import { AnalyticsQueryService } from './application/analytics-query.service';

@Module({
  providers: [AnalyticsProjectionRepository, AnalyticsProjectionService, AnalyticsQueryService],
  exports: [AnalyticsProjectionService, AnalyticsQueryService],
})
export class AnalyticsModule {}
