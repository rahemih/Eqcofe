import { Module } from '@nestjs/common';
import { ProviderConfigurationService } from './application/provider-configuration.service';
import { EnvironmentSecretResolver } from './infrastructure/environment-secret.resolver';
import { ProviderCircuitBreaker } from './infrastructure/provider-circuit-breaker';
import { ProviderConfigurationRepository } from './infrastructure/provider-configuration.repository';
import { ProviderHttpClient } from './infrastructure/provider-http-client';

@Module({
  providers:[
    ProviderConfigurationRepository,
    EnvironmentSecretResolver,
    ProviderConfigurationService,
    ProviderCircuitBreaker,
    ProviderHttpClient,
  ],
  exports:[ProviderConfigurationService, ProviderHttpClient],
})
export class IntegrationsModule {}
