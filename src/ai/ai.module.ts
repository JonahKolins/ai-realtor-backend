import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiOpenaiService } from './services/ai-openai.service';
import { AiPromptService } from './services/ai-prompt.service';
import { AiDraftService } from './services/ai-draft.service';
import aiConfig from './ai.config';

@Module({
  imports: [ConfigModule.forFeature(aiConfig)],
  providers: [AiOpenaiService, AiPromptService, AiDraftService],
  exports: [AiOpenaiService, AiPromptService, AiDraftService],
})
export class AiModule {}
