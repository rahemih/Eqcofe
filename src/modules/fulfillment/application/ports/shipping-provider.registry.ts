import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../../shared/errors/domain-error';
import { ShippingProviderPort } from './shipping-provider.port';
import { IntegrationShippingProviderAdapterFactory } from '../../infrastructure/integration-shipping-provider.adapter';

@Injectable()
export class ShippingProviderRegistry{
  private readonly providers=new Map<string,ShippingProviderPort>();
  constructor(private readonly adapters:IntegrationShippingProviderAdapterFactory){}
  register(provider:ShippingProviderPort){const key=String(provider.key).trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(key))throw new Error('invalid shipping provider key');if(this.providers.has(key))throw new Error(`duplicate shipping provider ${key}`);this.providers.set(key,provider);}
  resolve(key:string){const normalized=String(key??'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(normalized))throw new DomainError('SHIPPING_PROVIDER_NOT_CONFIGURED','ارائه‌دهنده حمل موردنظر پیکربندی نشده است.');return this.providers.get(normalized)??this.adapters.create(normalized);}
}
