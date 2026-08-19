import {Injectable} from '@nestjs/common';import {ConfigService} from '@nestjs/config';import {DomainError} from '../../../shared/errors/domain-error';import {PaymentProvider} from '../domain/payment.types';
@Injectable() export class ConfiguredPaymentProvider implements PaymentProvider{
 readonly key:string;constructor(private readonly config:ConfigService){this.key=this.config.get<string>('PAYMENT_PROVIDER_KEY','disabled');}
 private unavailable():never{throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE','درگاه پرداخت واقعی هنوز پیکربندی نشده است.');}
 async initiate():Promise<never>{return this.unavailable();} async verify():Promise<never>{return this.unavailable();} async reconcile():Promise<never>{return this.unavailable();}
 async parseWebhook(input:{raw_body:Buffer}):Promise<never>{if(!input.raw_body?.length)throw new DomainError('PAYMENT_WEBHOOK_RAW_BODY_REQUIRED','Raw body برای Webhook پرداخت الزامی است.');return this.unavailable();}
 async refund():Promise<never>{return this.unavailable();} async reconcileRefund():Promise<never>{return this.unavailable();}
}
