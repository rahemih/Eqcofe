import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../../../shared/errors/domain-error';
import { ShippingProviderPort } from './shipping-provider.port';
import { ConfiguredShippingProvider } from '../../infrastructure/configured-shipping.provider';

@Injectable()
export class ShippingProviderRegistry{
  private readonly providers=new Map<string,ShippingProviderPort>();
  constructor(private readonly config:ConfigService,private readonly configured:ConfiguredShippingProvider){
    const key=String(this.config.get<string>('SHIPPING_PROVIDER_KEY','disabled')).trim().toLowerCase();
    if(key!=='disabled')this.register(configured);
  }
  register(provider:ShippingProviderPort){const key=String(provider.key).trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(key))throw new Error('invalid shipping provider key');if(this.providers.has(key))throw new Error(`duplicate shipping provider ${key}`);this.providers.set(key,provider);}
  resolve(key:string){const normalized=String(key??'').trim().toLowerCase();const provider=this.providers.get(normalized);if(!provider)throw new DomainError('SHIPPING_PROVIDER_NOT_CONFIGURED','ارائه‌دهنده حمل موردنظر پیکربندی نشده است.');return provider;}
}
