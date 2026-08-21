import { Module } from '@nestjs/common';
import { FxRateService } from './application/fx-rate.service';
import { ProviderConfigurationService } from './application/provider-configuration.service';
import { ProviderHealthService } from './application/provider-health.service';
import { IntegrationProviderRegistry } from './application/provider-registry';
import { EnvironmentSecretResolver } from './infrastructure/environment-secret.resolver';
import { FxRateRepository } from './infrastructure/fx-rate.repository';
import { ProviderCircuitBreaker } from './infrastructure/provider-circuit-breaker';
import { ProviderConfigurationRepository } from './infrastructure/provider-configuration.repository';
import { ProviderHealthRepository } from './infrastructure/provider-health.repository';
import { ProviderHttpClient } from './infrastructure/provider-http-client';

@Module({
  providers:[
    ProviderConfigurationRepository,
    EnvironmentSecretResolver,
    ProviderConfigurationService,
    ProviderCircuitBreaker,
    ProviderHttpClient,
    IntegrationProviderRegistry,
    ProviderHealthRepository,
    ProviderHealthService,
    FxRateRepository,
    FxRateService,
  ],
  exports:[
    ProviderConfigurationService,
    ProviderHttpClient,
    IntegrationProviderRegistry,
    ProviderHealthService,
    FxRateService,
  ],
})
export class IntegrationsModule {}
