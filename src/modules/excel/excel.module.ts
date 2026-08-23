import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PricingModule } from '../pricing/pricing.module';
import { BinaryXlsxCodecService } from './application/binary-xlsx-codec.service';
import { SafeWorkbookParserService } from './application/safe-workbook-parser.service';
import { ExportTemplateService } from './application/export-template.service';
import { ImportJobService } from './application/import-job.service';
import { ImportRecoveryService } from './application/import-recovery.service';
import { CatalogDryRunService } from './application/catalog-dry-run.service';
import { CatalogApplyService } from './application/catalog-apply.service';
import { PricingApplyService } from './application/pricing-apply.service';
import { ExcelAdminService } from './application/excel-admin.service';
import { ImportJobRepository } from './infrastructure/import-job.repository';
import { ImportRecoveryRepository } from './infrastructure/import-recovery.repository';
import { ExcelAdminController } from './presentation/excel-admin.controller';

@Module({
  imports: [CatalogModule, PricingModule],
  controllers: [ExcelAdminController],
  providers: [
    BinaryXlsxCodecService,
    SafeWorkbookParserService,
    ExportTemplateService,
    ImportJobRepository,
    ImportRecoveryRepository,
    ImportJobService,
    ImportRecoveryService,
    CatalogDryRunService,
    CatalogApplyService,
    PricingApplyService,
    ExcelAdminService,
  ],
  exports: [BinaryXlsxCodecService, SafeWorkbookParserService, ExportTemplateService, ImportJobService, ImportRecoveryService, CatalogDryRunService, CatalogApplyService, PricingApplyService, ExcelAdminService],
})
export class ExcelModule {}
