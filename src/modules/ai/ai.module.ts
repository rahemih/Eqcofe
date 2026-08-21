import { Module } from '@nestjs/common';
import { GovernedPromptService } from './application/governed-prompt.service';
import { GovernedPromptRepository } from './infrastructure/governed-prompt.repository';

@Module({
  providers: [GovernedPromptRepository, GovernedPromptService],
  exports: [GovernedPromptService],
})
export class AiModule {}
