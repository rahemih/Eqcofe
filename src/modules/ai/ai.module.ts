import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ContentModule } from '../content/content.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AiUsageControlService } from './application/ai-usage-control.service';
import { DraftContentGenerationService } from './application/draft-content-generation.service';
import { GovernedPromptService } from './application/governed-prompt.service';
import { ProductQaService } from './application/product-qa.service';
import { AiUsageRepository } from './infrastructure/ai-usage.repository';
import { GovernedPromptRepository } from './infrastructure/governed-prompt.repository';
import { ConfiguredAiProviderAdapter } from './infrastructure/configured-ai-provider.adapter';

@Module({
  imports: [CatalogModule, ContentModule, IntegrationsModule],
  providers: [AiUsageRepository, AiUsageControlService, GovernedPromptRepository, GovernedPromptService, ConfiguredAiProviderAdapter, ProductQaService, DraftContentGenerationService],
  exports: [AiUsageControlService, GovernedPromptService, ConfiguredAiProviderAdapter, ProductQaService, DraftContentGenerationService],
})
export class AiModule {}
