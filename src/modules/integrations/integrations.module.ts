import { Module } from '@nestjs/common';
import { ProviderConfigurationService } from './application/provider-configuration.service';
import { EnvironmentSecretResolver } from './infrastructure/environment-secret.resolver';
import { ProviderConfigurationRepository } from './infrastructure/provider-configuration.repository';

@Module({
  providers:[
    ProviderConfigurationRepository,
    EnvironmentSecretResolver,
    ProviderConfigurationService,
  ],
  exports:[ProviderConfigurationService],
})
export class IntegrationsModule {}
