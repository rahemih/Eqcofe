import {Injectable} from '@nestjs/common';import {ConfigService} from '@nestjs/config';import {DomainError} from '../../../shared/errors/domain-error';import {ConfiguredPaymentProvider} from './configured-payment.provider';import {ZarinpalPaymentProvider} from './zarinpal-payment.provider';import {PaymentProvider,PaymentProviderRegistry} from '../domain/payment.types';
@Injectable() export class ConfiguredPaymentProviderRegistry implements PaymentProviderRegistry{
 constructor(private readonly config:ConfigService,private readonly configured:ConfiguredPaymentProvider,private readonly zarinpal:ZarinpalPaymentProvider){}
 active():PaymentProvider{const key=this.config.get<string>('PAYMENT_PROVIDER_KEY','disabled');return this.resolve(key);}
 resolve(key:string):PaymentProvider{if(key===this.zarinpal.key)return this.zarinpal;if(key===this.configured.key&&key!=='disabled')return this.configured;throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE','Adapter درگاه موردنیاز در دسترس نیست.');}
}
