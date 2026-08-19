import { Body,Controller,Get,Headers,Inject,Param,Post,Query,HttpCode,HttpStatus } from '@nestjs/common';
import { CustomerOnly,Public,RequireIdempotency } from '../../../platform/auth/auth.decorators';
import { OrderService } from '../application/order.service';
import { ORDER_CUSTOMER_READ_PORT,OrderCustomerReadPort } from '../application/ports/order-customer-read.port';

@Controller()
export class OrdersController{
 constructor(private readonly svc:OrderService,@Inject(ORDER_CUSTOMER_READ_PORT)private readonly customerRead:OrderCustomerReadPort){}
 @Public() @RequireIdempotency('order.create') @Post('checkout/:id/order') create(@Param('id')id:string,@Headers('x-checkout-token')t:string,@Body()b:any){return this.svc.create(id,t,b?.address);}
 @Public() @Get('orders/:number') getGuest(@Param('number')n:string,@Headers('x-checkout-token')t:string){return this.svc.getGuest(n,t);}
 @Public() @HttpCode(HttpStatus.OK) @RequireIdempotency('order.cancel') @Post('orders/:number/cancel') cancelGuest(@Param('number')n:string,@Headers('x-checkout-token')t:string,@Body()b:any){return this.svc.cancelGuest(n,t,b);}
 @CustomerOnly() @Get('customer/orders') list(@Query('cursor')cursor?:string,@Query('limit')limit?:string){return this.customerRead.list(cursor,Number(limit??25));}
 @CustomerOnly() @Get('customer/orders/:order_number') getCustomer(@Param('order_number')n:string){return this.customerRead.get(n);}
 @CustomerOnly() @Get('customer/orders/:order_number/timeline') timeline(@Param('order_number')n:string){return this.customerRead.timeline(n);}
 @CustomerOnly() @Get('customer/orders/:order_number/invoice') invoice(@Param('order_number')n:string){return this.customerRead.invoice(n);}
 @CustomerOnly() @HttpCode(HttpStatus.OK) @RequireIdempotency('customer.order.cancel') @Post('customer/orders/:order_number/cancel') cancelCustomer(@Param('order_number')n:string,@Body()b:any){return this.svc.cancelCustomer(n,b);}
}
