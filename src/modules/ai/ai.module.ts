import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { GovernedPromptService } from './application/governed-prompt.service';
import { GovernedPromptRepository } from './infrastructure/governed-prompt.repository';
import { ConfiguredAiProviderAdapter } from './infrastructure/configured-ai-provider.adapter';

@Module({
  imports: [IntegrationsModule],
  providers: [GovernedPromptRepository, GovernedPromptService, ConfiguredAiProviderAdapter],
  exports: [GovernedPromptService, ConfiguredAiProviderAdapter],
})
export class AiModule {}
