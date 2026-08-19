import {CanActivate,ExecutionContext,Inject,Injectable} from '@nestjs/common';import {ORDER_PAYMENT_PORT,OrderPaymentPort} from '../../orders/application/ports/order-payment.port';
@Injectable() export class PaymentOrderAccessGuard implements CanActivate{
 constructor(@Inject(ORDER_PAYMENT_PORT)private readonly orders:OrderPaymentPort){}
 async canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest<any>();const n=String(req.params?.order_number??'');const t=req.headers?.['x-checkout-token']?String(req.headers['x-checkout-token']):undefined;await this.orders.loadPayable(n,{checkoutToken:t});return true;}
}
