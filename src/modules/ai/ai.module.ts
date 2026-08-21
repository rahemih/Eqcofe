import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { GovernedPromptService } from './application/governed-prompt.service';
import { ProductQaService } from './application/product-qa.service';
import { GovernedPromptRepository } from './infrastructure/governed-prompt.repository';
import { ConfiguredAiProviderAdapter } from './infrastructure/configured-ai-provider.adapter';

@Module({
  imports: [CatalogModule, IntegrationsModule],
  providers: [GovernedPromptRepository, GovernedPromptService, ConfiguredAiProviderAdapter, ProductQaService],
  exports: [GovernedPromptService, ConfiguredAiProviderAdapter, ProductQaService],
})
export class AiModule {}
