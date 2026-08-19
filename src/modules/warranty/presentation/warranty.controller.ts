import { Body,Controller,Get,HttpCode,HttpStatus,Inject,Param,Post } from '@nestjs/common';
import { CustomerOnly,Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { DomainError } from '../../../shared/errors/domain-error';
import { WarrantyService } from '../application/warranty.service';
import { WARRANTY_CUSTOMER_READ_PORT,WarrantyCustomerReadPort } from '../application/ports/warranty-customer-read.port';

function uuid(v:string){
  const x=String(v??'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))
    throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');
  return x;
}

@Controller()
export class WarrantyController{
  constructor(private readonly warranty:WarrantyService,@Inject(WARRANTY_CUSTOMER_READ_PORT)private readonly customerRead:WarrantyCustomerReadPort){}

  @CustomerOnly()
  @RequireIdempotency('warranty.customer.create')
  @Post('customer/warranty/claims')
  createCustomer(@Body()body:any){return this.warranty.createCustomer(body);}

  @CustomerOnly()
  @Get('customer/warranty/claims')
  listCustomer(){return this.customerRead.list();}

  @CustomerOnly()
  @Get('customer/warranty/claims/:claim_number/timeline')
  timelineCustomer(@Param('claim_number')number:string){return this.customerRead.timeline(number);}

  @CustomerOnly()
  @Get('customer/warranty/claims/:claim_number')
  getCustomer(@Param('claim_number')number:string){return this.customerRead.get(number);}

  @StaffOnly()
  @Permissions('warranty.view')
  @Get('admin/warranty/claims')
  listAdmin(){return this.warranty.listAdmin();}

  @StaffOnly()
  @Permissions('warranty.view')
  @Get('admin/warranty/claims/:id/timeline')
  timelineAdmin(@Param('id')id:string){return this.warranty.timelineAdmin(uuid(id));}

  @StaffOnly()
  @Permissions('warranty.view')
  @Get('admin/warranty/claims/:id')
  getAdmin(@Param('id')id:string){return this.warranty.getAdmin(uuid(id));}

  @StaffOnly()
  @Permissions('warranty.review')
  @RequireIdempotency('warranty.admin.start_review')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/start-review')
  startReview(@Param('id')id:string,@Body()body:any){return this.warranty.startReview(uuid(id),body?.comment);}

  @StaffOnly()
  @Permissions('warranty.review')
  @RequireIdempotency('warranty.admin.approve')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/approve')
  approve(@Param('id')id:string,@Body()body:any){return this.warranty.approve(uuid(id),body?.comment);}

  @StaffOnly()
  @Permissions('warranty.review')
  @RequireIdempotency('warranty.admin.reject')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/reject')
  reject(@Param('id')id:string,@Body()body:any){return this.warranty.reject(uuid(id),body?.reason);}

  @StaffOnly()
  @Permissions('warranty.receive')
  @RequireIdempotency('warranty.admin.receive')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/receive')
  receive(@Param('id')id:string,@Body()body:any){return this.warranty.receive(uuid(id),body);}

  @StaffOnly()
  @Permissions('warranty.repair')
  @RequireIdempotency('warranty.admin.start_repair')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/start-repair')
  startRepair(@Param('id')id:string,@Body()body:any){return this.warranty.startRepair(uuid(id),body?.comment);}

  @StaffOnly()
  @Permissions('warranty.resolve')
  @RequireStepUp()
  @RequireIdempotency('warranty.admin.resolve')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/resolve')
  resolve(@Param('id')id:string,@Body()body:any){return this.warranty.resolve(uuid(id),body);}

  @StaffOnly()
  @Permissions('warranty.resolve')
  @RequireStepUp()
  @RequireIdempotency('warranty.admin.close')
  @HttpCode(HttpStatus.OK)
  @Post('admin/warranty/claims/:id/close')
  close(@Param('id')id:string,@Body()body:any){return this.warranty.close(uuid(id),body?.resolution_note);}
}
