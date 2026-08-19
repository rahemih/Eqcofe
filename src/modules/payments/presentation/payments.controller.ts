import {Body,Controller,Get,Headers,HttpCode,HttpStatus,Param,Post,Query,Req,UseGuards} from '@nestjs/common';
import {CustomerOnly,Permissions,Public,RequireIdempotency,RequireStepUp,StaffOnly} from '../../../platform/auth/auth.decorators';import {PaymentService} from '../application/payment.service';import {PaymentOrderAccessGuard} from './payment-order-access.guard';
@Controller() export class PaymentsController{constructor(private readonly svc:PaymentService){}
 @Public() @UseGuards(PaymentOrderAccessGuard) @RequireIdempotency('payment.initiate.guest') @Post('orders/:order_number/payments') initiate(@Param('order_number')n:string,@Headers('x-checkout-token')t:string|undefined){return this.svc.initiate(n,t);}
 @CustomerOnly() @RequireIdempotency('payment.initiate.customer') @Post('customer/orders/:order_number/payments') initiateCustomer(@Param('order_number')n:string){return this.svc.initiateCustomer(n);}
 @Public() @HttpCode(HttpStatus.OK) @Post('payments/:payment_id/callback') callback(@Param('payment_id')id:string,@Query('state')state?:string){return this.svc.callback(id,state);}
 @Public() @HttpCode(HttpStatus.OK) @Get('payments/:payment_id/callback') callbackGet(@Param('payment_id')id:string,@Query('state')state?:string){return this.svc.callback(id,state);}
 @CustomerOnly() @HttpCode(HttpStatus.OK) @Post('customer/payments/:payment_id/verify') verifyCustomer(@Param('payment_id')id:string){return this.svc.verify(id);}
 @Public() @HttpCode(HttpStatus.OK) @Post('payments/:payment_id/verify') verify(@Param('payment_id')id:string,@Headers('x-checkout-token')t:string|undefined){return this.svc.verify(id,t);}
 @CustomerOnly() @Get('customer/orders/:order_number/payments/:payment_id') getCustomerPayment(@Param('order_number')n:string,@Param('payment_id')id:string){return this.svc.getForOrder(n,id);}
 @CustomerOnly() @Get('customer/payments/:payment_id/status') customerStatus(@Param('payment_id')id:string){return this.svc.status(id);}
 @Public() @Get('orders/:order_number/payments/:payment_id') get(@Param('order_number')n:string,@Param('payment_id')id:string,@Headers('x-checkout-token')t:string|undefined){return this.svc.getForOrder(n,id,t);}
 @Public() @Get('payments/:payment_id/status') status(@Param('payment_id')id:string,@Headers('x-checkout-token')t:string|undefined){return this.svc.status(id,t);}
 @Public() @HttpCode(HttpStatus.OK) @Post('webhooks/payments/:provider_key') webhook(@Param('provider_key')k:string,@Req()req:any,@Body()b:unknown){return this.svc.webhook(k,req.headers??{},b,req.rawBody);}
 @StaffOnly() @Permissions('refund.view') @Get('admin/refunds') refunds(@Query('limit')l?:string){return this.svc.listRefunds(Number(l??100));}
 @StaffOnly() @Permissions('refund.create') @RequireStepUp() @RequireIdempotency('refund.create') @Post('admin/refunds') createRefund(@Body()b:any){return this.svc.createRefund(b);}
 @StaffOnly() @Permissions('refund.view') @Get('admin/refunds/:id') refund(@Param('id')id:string){return this.svc.getRefund(id);}
 @StaffOnly() @Permissions('refund.approve') @RequireStepUp() @RequireIdempotency('refund.approve') @HttpCode(HttpStatus.OK) @Post('admin/refunds/:id/approve') approveRefund(@Param('id')id:string){return this.svc.approveRefund(id);}
 @StaffOnly() @Permissions('refund.reject') @RequireStepUp() @RequireIdempotency('refund.reject') @HttpCode(HttpStatus.OK) @Post('admin/refunds/:id/reject') rejectRefund(@Param('id')id:string){return this.svc.rejectRefund(id);}
 @StaffOnly() @Permissions('refund.process') @RequireStepUp() @RequireIdempotency('refund.process') @HttpCode(HttpStatus.OK) @Post('admin/refunds/:id/process') processRefund(@Param('id')id:string){return this.svc.processRefund(id);}
 @StaffOnly() @Permissions('refund.process') @RequireStepUp() @RequireIdempotency('refund.retry') @HttpCode(HttpStatus.OK) @Post('admin/refunds/:id/retry') retryRefund(@Param('id')id:string){return this.svc.retryRefund(id);}
 @StaffOnly() @Permissions('refund.process') @RequireStepUp() @RequireIdempotency('refund.reconcile') @HttpCode(HttpStatus.OK) @Post('admin/refunds/:id/reconcile') reconcileRefund(@Param('id')id:string){return this.svc.reconcileRefund(id);}
 @StaffOnly() @Permissions('refund.cancel') @RequireStepUp() @RequireIdempotency('refund.cancel') @HttpCode(HttpStatus.OK) @Post('admin/refunds/:id/cancel') cancelRefund(@Param('id')id:string){return this.svc.cancelRefund(id);}
 @StaffOnly() @Permissions('payments.view') @Get('admin/payments') list(@Query('limit')l?:string){return this.svc.adminList(Number(l??50));}
 @StaffOnly() @Permissions('payments.view') @Get('admin/payments/:id') adminGet(@Param('id')id:string){return this.svc.adminGet(id);}
 @StaffOnly() @Permissions('payments.view') @Get('admin/payments/:id/attempts') attempts(@Param('id')id:string){return this.svc.attempts(id);}
 @StaffOnly() @Permissions('payments.reconcile') @RequireStepUp() @RequireIdempotency('payment.reconcile') @HttpCode(HttpStatus.OK) @Post('admin/payments/:id/reconcile') reconcile(@Param('id')id:string){return this.svc.reconcile(id);}
}
