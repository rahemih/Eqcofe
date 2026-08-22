import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { SafeWorkbookParserService } from './application/safe-workbook-parser.service';
import { ExportTemplateService } from './application/export-template.service';
import { ImportJobService } from './application/import-job.service';
import { CatalogDryRunService } from './application/catalog-dry-run.service';
import { ImportJobRepository } from './infrastructure/import-job.repository';

@Module({
  imports: [CatalogModule],
  providers: [
    SafeWorkbookParserService,
    ExportTemplateService,
    ImportJobRepository,
    ImportJobService,
    CatalogDryRunService,
  ],
  exports: [SafeWorkbookParserService, ExportTemplateService, ImportJobService, CatalogDryRunService],
})
export class ExcelModule {}
