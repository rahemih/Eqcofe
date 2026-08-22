import { Module } from '@nestjs/common';
import { SafeWorkbookParserService } from './application/safe-workbook-parser.service';
import { ExportTemplateService } from './application/export-template.service';

@Module({
  providers: [SafeWorkbookParserService, ExportTemplateService],
  exports: [SafeWorkbookParserService, ExportTemplateService],
})
export class ExcelModule {}
