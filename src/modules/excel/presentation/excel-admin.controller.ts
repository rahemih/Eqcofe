import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions, RequireIdempotency, RequireStepUp, StaffOnly } from '../../../platform/auth/auth.decorators';
import { WorkbookUploadEnvelope } from '../domain/workbook-contract';
import { ExcelAdminService } from '../application/excel-admin.service';

@Controller('admin/excel')
@StaffOnly()
export class ExcelAdminController {
  constructor(private readonly excel: ExcelAdminService) {}

  @Permissions('excel.view')
  @Get('exports/template')
  exportTemplate() { return this.excel.exportTemplate(); }

  @Permissions('excel.view')
  @Post('dry-run')
  dryRun(@Body() body: { workbook?: WorkbookUploadEnvelope }) { return this.excel.dryRun(body?.workbook as WorkbookUploadEnvelope); }

  @Permissions('excel.view')
  @Post('catalog/preview')
  catalogPreview(@Body() body: { workbook?: WorkbookUploadEnvelope }) { return this.excel.catalogPreview(body?.workbook as WorkbookUploadEnvelope); }

  @Permissions('excel.view')
  @Post('pricing/preview')
  pricingPreview(@Body() body: { workbook?: WorkbookUploadEnvelope }) { return this.excel.pricingPreview(body?.workbook as WorkbookUploadEnvelope); }

  @Permissions('excel.import')
  @RequireIdempotency('excel.import.create')
  @Post('imports')
  createImport(@Body() body: { workbook?: WorkbookUploadEnvelope }) { return this.excel.createImport(body?.workbook as WorkbookUploadEnvelope); }

  @Permissions('excel.apply')
  @RequireStepUp()
  @RequireIdempotency('excel.catalog.apply')
  @Post('catalog/apply')
  catalogApply(@Body() body: { workbook?: WorkbookUploadEnvelope; expected_preview_hash?: string }) {
    return this.excel.catalogApply(body?.workbook as WorkbookUploadEnvelope, body?.expected_preview_hash);
  }

  @Permissions('excel.apply')
  @RequireStepUp()
  @RequireIdempotency('excel.pricing.apply')
  @Post('pricing/apply')
  pricingApply(@Body() body: { workbook?: WorkbookUploadEnvelope; expected_preview_hash?: string }) {
    return this.excel.pricingApply(body?.workbook as WorkbookUploadEnvelope, body?.expected_preview_hash);
  }

  @Permissions('excel.recover')
  @RequireStepUp()
  @RequireIdempotency('excel.import.recover')
  @Post('imports/:id/recover')
  recover(@Param('id') id: string, @Body() body: { note?: string }) { return this.excel.recover(id, body?.note); }
}
