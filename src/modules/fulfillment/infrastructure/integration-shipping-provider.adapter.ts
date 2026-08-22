import { Injectable } from '@nestjs/common';
import { ShippingProviderService } from '../../integrations/application/shipping-provider.service';
import { ShippingProviderPort } from '../application/ports/shipping-provider.port';

@Injectable()
export class IntegrationShippingProviderAdapterFactory{
  constructor(private readonly shipping:ShippingProviderService){}
  create(providerKey:string):ShippingProviderPort{
    const key=String(providerKey??'').trim().toLowerCase();
    return{
      key,
      refresh:async({trackingNumber})=>this.shipping.refresh(key,trackingNumber),
      parseWebhook:async(input)=>this.shipping.parseWebhook(key,input),
    };
  }
}
