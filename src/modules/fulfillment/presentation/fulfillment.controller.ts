import { Body,Controller,Get,HttpCode,HttpStatus,Param,Post,Req } from '@nestjs/common';
import { Permissions,Public,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { DomainError } from '../../../shared/errors/domain-error';
import { allocateBody,cancelBody,entityId,pickBody,preparationBody,shipmentBody,unpickBody } from './fulfillment.http-validation';
import { FulfillmentService } from '../application/fulfillment.service';
import { ShipmentService } from '../application/shipment.service';
@Controller()
export class FulfillmentController{
  constructor(private readonly fulfillment:FulfillmentService,private readonly shipments:ShipmentService){}
  @StaffOnly() @Permissions('fulfillment.view') @Get('admin/fulfillment/orders') list(){return this.fulfillment.list();}
  @StaffOnly() @Permissions('fulfillment.view') @Get('admin/fulfillment/orders/:order_id') get(@Param('order_id')id:string){return this.fulfillment.get(entityId(id));}
  @StaffOnly() @Permissions('fulfillment.allocate') @RequireIdempotency('fulfillment.allocate') @HttpCode(HttpStatus.OK) @Post('admin/fulfillment/orders/:order_id/allocate') allocate(@Param('order_id')id:string,@Body()b:any){return this.fulfillment.allocate(entityId(id),allocateBody(b));}
  @StaffOnly() @Permissions('fulfillment.allocate') @RequireIdempotency('fulfillment.start_preparation') @HttpCode(HttpStatus.OK) @Post('admin/fulfillment/orders/:order_id/start-preparation') prepare(@Param('order_id')id:string,@Body()b:any){return this.fulfillment.startPreparation(entityId(id),preparationBody(b));}
  @StaffOnly() @Permissions('fulfillment.pick') @RequireIdempotency('fulfillment.pick') @HttpCode(HttpStatus.OK) @Post('admin/fulfillment/allocations/:id/pick') pick(@Param('id')id:string,@Body()b:any){return this.fulfillment.pick(entityId(id),pickBody(b));}
  @StaffOnly() @Permissions('fulfillment.pick') @RequireIdempotency('fulfillment.unpick') @HttpCode(HttpStatus.OK) @Post('admin/fulfillment/allocations/:id/unpick') unpick(@Param('id')id:string,@Body()b:any){return this.fulfillment.unpick(entityId(id),unpickBody(b));}

  @StaffOnly() @Permissions('fulfillment.shipment.manage') @RequireIdempotency('shipment.create') @HttpCode(HttpStatus.OK) @Post('admin/shipments') createShipment(@Body()b:any){return this.shipments.create(shipmentBody(b));}
  @StaffOnly() @Permissions('fulfillment.view') @Get('admin/shipments') listShipments(){return this.shipments.list();}
  @StaffOnly() @Permissions('fulfillment.view') @Get('admin/shipments/:id') shipment(@Param('id')id:string){return this.shipments.get(entityId(id));}
  @StaffOnly() @Permissions('fulfillment.shipment.manage') @RequireIdempotency('shipment.mark_ready') @HttpCode(HttpStatus.OK) @Post('admin/shipments/:id/mark-ready') ready(@Param('id')id:string){return this.shipments.markReady(entityId(id));}
  @StaffOnly() @Permissions('fulfillment.shipment.manage') @RequireStepUp() @RequireIdempotency('shipment.handover') @HttpCode(HttpStatus.OK) @Post('admin/shipments/:id/handover') handover(@Param('id')id:string){return this.shipments.handover(entityId(id));}
  @StaffOnly() @Permissions('fulfillment.shipment.manage') @RequireStepUp() @RequireIdempotency('shipment.cancel') @HttpCode(HttpStatus.OK) @Post('admin/shipments/:id/cancel') cancel(@Param('id')id:string,@Body()b:any){return this.shipments.cancel(entityId(id),cancelBody(b).reason);}
  @StaffOnly() @Permissions('fulfillment.tracking.manage') @RequireIdempotency('shipment.refresh_tracking') @HttpCode(HttpStatus.OK) @Post('admin/shipments/:id/refresh-tracking') refresh(@Param('id')id:string){return this.shipments.refreshTracking(entityId(id));}

  @Public() @HttpCode(HttpStatus.OK) @Post('webhooks/shipping/:provider_key')
  webhook(@Param('provider_key')key:string,@Req()req:any,@Body()b:unknown){const k=String(key??'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(k))throw new DomainError('VALIDATION_ERROR','کلید ارائه‌دهنده حمل معتبر نیست.');return this.shipments.webhook(k,req.headers??{},b,req.rawBody);}
}
