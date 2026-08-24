import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import { Permissions, RequireIdempotency, RequireStepUp, StaffOnly } from '../../../platform/auth/auth.decorators';
import { CustomerManagementService } from '../application/customer-management.service';
import { InventoryManagementService } from '../application/inventory-management.service';
import { ManagementExportService } from '../application/management-export.service';
import { OperationalManagementService } from '../application/operational-management.service';
import { ProfitManagementService } from '../application/profit-management.service';
import { SalesRevenueManagementService } from '../application/sales-revenue-management.service';
import { WholesaleManagementService } from '../application/wholesale-management.service';

@Controller('admin/analytics')
@StaffOnly()
export class AnalyticsManagementController {
  constructor(
    private readonly sales: SalesRevenueManagementService,
    private readonly profit: ProfitManagementService,
    private readonly inventory: InventoryManagementService,
    private readonly customers: CustomerManagementService,
    private readonly wholesale: WholesaleManagementService,
    private readonly operations: OperationalManagementService,
    private readonly exports: ManagementExportService,
  ) {}

  @Permissions('analytics.view')
  @Get('sales-revenue')
  salesRevenue(@Query('from') from: string, @Query('to') to: string) { return this.sales.read(from, to); }

  @Permissions('analytics.view')
  @Get('profit')
  profitRead(@Query('from') from: string, @Query('to') to: string) { return this.profit.read(from, to); }

  @Permissions('analytics.view')
  @Get('inventory')
  inventoryRead(@Query('limit') limit?: string) { return this.inventory.read(limit); }

  @Permissions('analytics.view')
  @Get('customers')
  customerRead(@Query('limit') limit?: string) { return this.customers.read(limit); }

  @Permissions('analytics.view')
  @Get('wholesale-applications')
  wholesaleRead(@Query('limit') limit?: string) { return this.wholesale.read(limit); }

  @Permissions('analytics.view')
  @Get('operations')
  operationalRead(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('as_of') asOf: string,
    @Query('limit') limit?: string,
  ) { return this.operations.read({ from, to, asOf, limit }); }

  @Permissions('analytics.export.create')
  @RequireStepUp()
  @RequireIdempotency('analytics.export.create')
  @Post('exports')
  createExport(@Headers('idempotency-key') idempotencyKey: string, @Body() body: any) {
    return this.exports.create({
      dataset: body?.dataset,
      format: body?.format,
      parameters: normalizeExportParameters(body?.parameters),
      idempotencyKey,
    });
  }

  @Permissions('analytics.export.view')
  @Get('exports')
  listExports(@Query('limit') limit?: string) { return this.exports.list(limit); }

  @Permissions('analytics.export.view')
  @Get('exports/:id')
  getExport(@Param('id') id: string) { return this.exports.get(id); }

  @Permissions('analytics.export.download')
  @RequireStepUp()
  @Get('exports/:id/download')
  async downloadExport(@Param('id') id: string, @Res({ passthrough: true }) response: any) {
    const artifact = await this.exports.download(id);
    response.header('Content-Type', artifact.mimeType);
    response.header('Content-Disposition', artifact.headers['Content-Disposition']);
    response.header('X-Content-Type-Options', 'nosniff');
    response.header('Cache-Control', 'no-store, private');
    return Buffer.from(artifact.content, 'utf8');
  }
}

function normalizeExportParameters(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const parameters = { ...(value as Record<string, unknown>) };
  if (parameters.as_of !== undefined && parameters.asOf === undefined) parameters.asOf = parameters.as_of;
  delete parameters.as_of;
  return parameters;
}
