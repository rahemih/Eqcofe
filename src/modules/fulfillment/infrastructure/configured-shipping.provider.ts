import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShippingProviderService } from '../../integrations/application/shipping-provider.service';
import { ShippingProviderPort } from '../application/ports/shipping-provider.port';

/** @deprecated Runtime wiring uses IntegrationShippingProviderAdapterFactory. Kept as a compatibility adapter only. */
@Injectable()
export class ConfiguredShippingProvider implements ShippingProviderPort{
  readonly key:string;
  constructor(config:ConfigService,private readonly shipping:ShippingProviderService){this.key=String(config.get<string>('SHIPPING_PROVIDER_KEY','disabled')).trim().toLowerCase();}
  refresh(input:{trackingNumber:string}){return this.shipping.refresh(this.key,input.trackingNumber);}
  parseWebhook(input:{headers:Record<string,string|string[]|undefined>;body:unknown;rawBody:Buffer}){return this.shipping.parseWebhook(this.key,input);}
}
