import { Body,Controller,Get,HttpCode,HttpStatus,Inject,Param,Post } from '@nestjs/common';
import { CustomerOnly,Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { DomainError } from '../../../shared/errors/domain-error';
import { ReturnsService } from '../application/returns.service';
import { RETURN_CUSTOMER_READ_PORT,ReturnCustomerReadPort } from '../application/ports/return-customer-read.port';

function uuid(v:string){
  const x=String(v??'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))
    throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');
  return x;
}

@Controller()
export class ReturnsController{
  constructor(private readonly returns:ReturnsService,@Inject(RETURN_CUSTOMER_READ_PORT)private readonly customerRead:ReturnCustomerReadPort){}

  @CustomerOnly()
  @RequireIdempotency('return.customer.create')
  @Post('customer/orders/:order_number/returns')
  createCustomer(@Param('order_number')orderNumber:string,@Body()body:any){
    return this.returns.createCustomer(orderNumber,body);
  }

  @CustomerOnly()
  @Get('customer/returns')
  listCustomer(){return this.customerRead.list();}

  @CustomerOnly()
  @Get('customer/returns/:return_number/timeline')
  timelineCustomer(@Param('return_number')number:string){return this.customerRead.timeline(number);}

  @CustomerOnly()
  @Get('customer/returns/:return_number')
  getCustomer(@Param('return_number')number:string){return this.customerRead.get(number);}

  @CustomerOnly()
  @RequireIdempotency('return.customer.cancel')
  @HttpCode(HttpStatus.OK)
  @Post('customer/returns/:return_number/cancel')
  cancelCustomer(@Param('return_number')number:string,@Body()body:any){
    return this.returns.cancelCustomer(number,body?.reason);
  }

  @StaffOnly()
  @Permissions('returns.view')
  @Get('admin/returns')
  listAdmin(){return this.returns.listAdmin();}

  @StaffOnly()
  @Permissions('returns.view')
  @Get('admin/returns/:id/timeline')
  timelineAdmin(@Param('id')id:string){return this.returns.timelineAdmin(uuid(id));}

  @StaffOnly()
  @Permissions('returns.view')
  @Get('admin/returns/:id')
  getAdmin(@Param('id')id:string){return this.returns.getAdmin(uuid(id));}

  @StaffOnly()
  @Permissions('returns.review')
  @RequireIdempotency('return.admin.start_review')
  @HttpCode(HttpStatus.OK)
  @Post('admin/returns/:id/start-review')
  startReview(@Param('id')id:string,@Body()body:any){return this.returns.startReview(uuid(id),body?.comment);}

  @StaffOnly()
  @Permissions('returns.review')
  @RequireIdempotency('return.admin.approve')
  @HttpCode(HttpStatus.OK)
  @Post('admin/returns/:id/approve')
  approve(@Param('id')id:string,@Body()body:any){return this.returns.approve(uuid(id),body?.comment);}

  @StaffOnly()
  @Permissions('returns.review')
  @RequireIdempotency('return.admin.reject')
  @HttpCode(HttpStatus.OK)
  @Post('admin/returns/:id/reject')
  reject(@Param('id')id:string,@Body()body:any){return this.returns.reject(uuid(id),body?.reason);}

  @StaffOnly()
  @Permissions('returns.receive')
  @RequireIdempotency('return.admin.receive')
  @HttpCode(HttpStatus.OK)
  @Post('admin/returns/:id/receive')
  receive(@Param('id')id:string,@Body()body:any){return this.returns.receive(uuid(id),body);}

  @StaffOnly()
  @Permissions('returns.inspect')
  @RequireIdempotency('return.admin.start_inspection')
  @HttpCode(HttpStatus.OK)
  @Post('admin/returns/:id/start-inspection')
  startInspection(@Param('id')id:string,@Body()body:any){return this.returns.startInspection(uuid(id),body?.comment);}

  @StaffOnly()
  @Permissions('returns.resolve')
  @RequireStepUp()
  @RequireIdempotency('return.admin.resolve')
  @HttpCode(HttpStatus.OK)
  @Post('admin/returns/:id/resolve')
  resolve(@Param('id')id:string,@Body()body:any){return this.returns.resolve(uuid(id),body);}
}
