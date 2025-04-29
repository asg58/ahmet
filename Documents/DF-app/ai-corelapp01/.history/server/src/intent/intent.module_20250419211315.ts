import { Module } from '@nestjs/common';
import { IntentService } from './intent.service';
import { OllamaModule } from '../ollama/ollama.module';
import { ChromaModule } from '../chroma/chroma.module';
import { SoftwareModule } from '../software/software.module';

@Module({
  imports: [
    OllamaModule,
    ChromaModule,
    SoftwareModule,
  ],
  providers: [IntentService],
  exports: [IntentService],
})
export class IntentModule {} 