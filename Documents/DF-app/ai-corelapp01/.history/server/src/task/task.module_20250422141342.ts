import { Module } from '@nestjs/common';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [OllamaModule],
  providers: [],
  exports: [OllamaModule]
})
export class TaskModule {} 