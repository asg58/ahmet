import { Module } from '@nestjs/common';
import { IntentService } from './intent.service';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [OllamaModule],
  providers: [IntentService],
  exports: [IntentService],
})
export class IntentModule {} 