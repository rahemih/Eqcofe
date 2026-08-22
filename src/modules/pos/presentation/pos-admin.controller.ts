import { Body,Controller,Get,Headers,HttpCode,HttpStatus,Param,Post,Query } from '@nestjs/common';
import { Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { PosAdminReconciliationService } from '../application/pos-admin-reconciliation.service';
import { PosOperationsService } from '../application/pos-operations.service';

@Controller('admin/pos')
@StaffOnly()
export class PosAdminController {
  constructor(private readonly ops:PosOperationsService,private readonly reconciliation:PosAdminReconciliationService){}

  @Permissions('pos.view')
  @Get('scan')
  resolveScan(@Query('kind') kind:'sku'|'barcode',@Query('value') value:string){return this.ops.resolveScan(kind,value);}

  @Permissions('pos.sell')
  @RequireIdempotency('pos.sale.create')
  @Post('sales')
  createSale(@Headers('idempotency-key') idempotencyKey:string){return this.ops.createSale(idempotencyKey);}

  @Permissions('pos.sell')
  @RequireIdempotency('pos.sale.line.add')
  @Post('sales/:id/lines')
  addLine(@Param('id') id:string,@Body() body:any){return this.ops.addLine(id,body?.variant_id,body?.quantity);}

  @Permissions('pos.sell')
  @RequireIdempotency('pos.sale.price')
  @HttpCode(HttpStatus.OK)
  @Post('sales/:id/price')
  price(@Param('id') id:string,@Body() body:any){return this.ops.priceSale(id,body?.customer_type??'retail');}

  @Permissions('pos.sell')
  @RequireIdempotency('pos.sale.commit')
  @HttpCode(HttpStatus.OK)
  @Post('sales/:id/commit')
  commit(@Param('id') id:string,@Body() body:any){return this.ops.commitSale({saleId:id,warehouseId:body?.warehouse_id,expectedVersion:body?.expected_version,paymentMethod:body?.payment_method,externalReference:body?.external_reference});}

  @Permissions('pos.sell')
  @RequireIdempotency('pos.offline.capture')
  @Post('offline/commands')
  captureOffline(@Headers('idempotency-key') idempotencyKey:string,@Body() body:any){return this.ops.captureOffline(idempotencyKey,body);}

  @Permissions('pos.sell')
  @RequireIdempotency('pos.offline.sync')
  @HttpCode(HttpStatus.OK)
  @Post('offline/commands/:clientCommandId/sync')
  syncOffline(@Param('clientCommandId') clientCommandId:string){return this.ops.syncOffline(clientCommandId);}

  @Permissions('pos.reconcile')
  @Get('reconciliation/failed')
  listFailed(@Query('limit') limit?:string){return this.reconciliation.listFailed(limit??50);}

  @Permissions('pos.reconcile')
  @Get('reconciliation/:clientCommandId')
  inspect(@Param('clientCommandId') clientCommandId:string){return this.reconciliation.inspect(clientCommandId);}

  @Permissions('pos.reconcile')
  @RequireStepUp()
  @RequireIdempotency('pos.reconciliation.admin.retry')
  @HttpCode(HttpStatus.OK)
  @Post('reconciliation/:clientCommandId/retry')
  retry(@Param('clientCommandId') clientCommandId:string,@Body() body:any){return this.reconciliation.retry(clientCommandId,body?.note);}

  @Permissions('pos.reconcile')
  @RequireStepUp()
  @RequireIdempotency('pos.reconciliation.admin.abandon')
  @HttpCode(HttpStatus.OK)
  @Post('reconciliation/:clientCommandId/abandon')
  abandon(@Param('clientCommandId') clientCommandId:string,@Body() body:any){return this.reconciliation.abandon(clientCommandId,body?.note);}
}
