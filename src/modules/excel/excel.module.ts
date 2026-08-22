import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PricingModule } from '../pricing/pricing.module';
import { SafeWorkbookParserService } from './application/safe-workbook-parser.service';
import { ExportTemplateService } from './application/export-template.service';
import { ImportJobService } from './application/import-job.service';
import { CatalogDryRunService } from './application/catalog-dry-run.service';
import { CatalogApplyService } from './application/catalog-apply.service';
import { PricingApplyService } from './application/pricing-apply.service';
import { ImportJobRepository } from './infrastructure/import-job.repository';

@Module({
  imports: [CatalogModule, PricingModule],
  providers: [
    SafeWorkbookParserService,
    ExportTemplateService,
    ImportJobRepository,
    ImportJobService,
    CatalogDryRunService,
    CatalogApplyService,
    PricingApplyService,
  ],
  exports: [SafeWorkbookParserService, ExportTemplateService, ImportJobService, CatalogDryRunService, CatalogApplyService, PricingApplyService],
})
export class ExcelModule {}
