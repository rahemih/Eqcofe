import { Module } from '@nestjs/common';
import { AnalyticsProjectionRepository } from './infrastructure/analytics-projection.repository';
import { AnalyticsAuthoritativeSourceReader } from './infrastructure/analytics-authoritative-source.reader';
import { AnalyticsProjectionService } from './application/analytics-projection.service';
import { AnalyticsQueryService } from './application/analytics-query.service';
import { AnalyticsCrossDomainConsumer } from './application/analytics-cross-domain.consumer';

@Module({
  providers: [
    AnalyticsProjectionRepository,
    AnalyticsAuthoritativeSourceReader,
    AnalyticsProjectionService,
    AnalyticsQueryService,
    AnalyticsCrossDomainConsumer,
  ],
  exports: [AnalyticsProjectionService, AnalyticsQueryService],
})
export class AnalyticsModule {}
