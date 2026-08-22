import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { ProviderConfiguration, validateProviderConfiguration } from '../domain/provider-configuration';
import { ProviderConfigurationRepository } from '../infrastructure/provider-configuration.repository';
import { EnvironmentSecretResolver } from '../infrastructure/environment-secret.resolver';

@Injectable()
export class ProviderConfigurationService {
  constructor(private readonly repo:ProviderConfigurationRepository,private readonly secrets:EnvironmentSecretResolver){}

  async list(){return this.repo.list();}

  async require(key:string):Promise<{configuration:ProviderConfiguration;secret:string|null}> {
    const row=await this.repo.byKey(key);
    if(!row)throw new DomainError('INTEGRATION_PROVIDER_NOT_FOUND','Provider پیکربندی‌شده پیدا نشد.');
    const configuration=validateProviderConfiguration({key:String(row.provider_key),kind:row.provider_kind,enabled:Boolean(row.enabled),baseUrl:row.base_url??null,timeoutMs:Number(row.timeout_ms),retryMaxAttempts:Number(row.retry_max_attempts),secretRef:row.secret_ref??null,config:(row.config??{}) as Record<string,unknown>});
    if(!configuration.enabled)throw new DomainError('INTEGRATION_PROVIDER_DISABLED','Provider غیرفعال است.');
    return {configuration,secret:this.secrets.resolve(configuration.secretRef)};
  }
}
