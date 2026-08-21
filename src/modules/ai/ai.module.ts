import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ContentModule } from '../content/content.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { DraftContentGenerationService } from './application/draft-content-generation.service';
import { GovernedPromptService } from './application/governed-prompt.service';
import { ProductQaService } from './application/product-qa.service';
import { GovernedPromptRepository } from './infrastructure/governed-prompt.repository';
import { ConfiguredAiProviderAdapter } from './infrastructure/configured-ai-provider.adapter';

@Module({
  imports: [CatalogModule, ContentModule, IntegrationsModule],
  providers: [GovernedPromptRepository, GovernedPromptService, ConfiguredAiProviderAdapter, ProductQaService, DraftContentGenerationService],
  exports: [GovernedPromptService, ConfiguredAiProviderAdapter, ProductQaService, DraftContentGenerationService],
})
export class AiModule {}
