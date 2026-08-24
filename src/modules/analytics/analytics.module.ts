import { Module } from '@nestjs/common';
import { AnalyticsProjectionRepository } from './infrastructure/analytics-projection.repository';
import { AnalyticsAuthoritativeSourceReader } from './infrastructure/analytics-authoritative-source.reader';
import { AnalyticsProjectionService } from './application/analytics-projection.service';
import { AnalyticsQueryService } from './application/analytics-query.service';
import { AnalyticsCrossDomainConsumer } from './application/analytics-cross-domain.consumer';
import { SalesRevenueManagementService } from './application/sales-revenue-management.service';
import { ProfitManagementService } from './application/profit-management.service';
import { InventoryManagementService } from './application/inventory-management.service';
import { CustomerManagementService } from './application/customer-management.service';
import { WholesaleManagementService } from './application/wholesale-management.service';
import { OperationalManagementService } from './application/operational-management.service';
import { ManagementExportRepository } from './infrastructure/management-export.repository';
import { ManagementExportService } from './application/management-export.service';
import { AnalyticsManagementController } from './presentation/analytics-management.controller';

@Module({
  controllers: [AnalyticsManagementController],
  providers: [
    AnalyticsProjectionRepository,
    AnalyticsAuthoritativeSourceReader,
    AnalyticsProjectionService,
    AnalyticsQueryService,
    AnalyticsCrossDomainConsumer,
    SalesRevenueManagementService,
    ProfitManagementService,
    InventoryManagementService,
    CustomerManagementService,
    WholesaleManagementService,
    OperationalManagementService,
    ManagementExportRepository,
    ManagementExportService,
  ],
  exports: [
    AnalyticsProjectionService,
    AnalyticsQueryService,
    SalesRevenueManagementService,
    ProfitManagementService,
    InventoryManagementService,
    CustomerManagementService,
    WholesaleManagementService,
    OperationalManagementService,
    ManagementExportService,
  ],
})
export class AnalyticsModule {}
