import { Module } from '@nestjs/common';
import { SafeWorkbookParserService } from './application/safe-workbook-parser.service';
import { ExportTemplateService } from './application/export-template.service';
import { ImportJobService } from './application/import-job.service';
import { ImportJobRepository } from './infrastructure/import-job.repository';

@Module({
  providers: [SafeWorkbookParserService, ExportTemplateService, ImportJobRepository, ImportJobService],
  exports: [SafeWorkbookParserService, ExportTemplateService, ImportJobService],
})
export class ExcelModule {}
