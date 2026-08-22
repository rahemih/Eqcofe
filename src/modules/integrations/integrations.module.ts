import { Module } from '@nestjs/common';
import { FxRateService } from './application/fx-rate.service';
import { NotificationChannelAdapterFactory } from './application/notification-channel-adapter.factory';
import { PaymentAuxProviderService } from './application/payment-aux-provider.service';
import { ProviderConfigurationService } from './application/provider-configuration.service';
import { ProviderHealthService } from './application/provider-health.service';
import { IntegrationProviderRegistry } from './application/provider-registry';
import { ShippingProviderService } from './application/shipping-provider.service';
import { EnvironmentSecretResolver } from './infrastructure/environment-secret.resolver';
import { FxRateRepository } from './infrastructure/fx-rate.repository';
import { ProviderCircuitBreaker } from './infrastructure/provider-circuit-breaker';
import { ProviderConfigurationRepository } from './infrastructure/provider-configuration.repository';
import { ProviderHealthRepository } from './infrastructure/provider-health.repository';
import { ProviderHttpClient } from './infrastructure/provider-http-client';

@Module({providers:[ProviderConfigurationRepository,EnvironmentSecretResolver,ProviderConfigurationService,ProviderCircuitBreaker,ProviderHttpClient,IntegrationProviderRegistry,ProviderHealthRepository,ProviderHealthService,FxRateRepository,FxRateService,NotificationChannelAdapterFactory,ShippingProviderService,PaymentAuxProviderService],exports:[ProviderConfigurationService,ProviderHttpClient,IntegrationProviderRegistry,ProviderHealthService,FxRateService,NotificationChannelAdapterFactory,ShippingProviderService,PaymentAuxProviderService]})
export class IntegrationsModule {}
