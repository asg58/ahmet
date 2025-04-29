import { Module } from '@nestjs/common';
import { IntentService } from './intent.service';
import { IntentController } from './intent.controller';
import { OllamaModule } from '../ollama/ollama.module';
import { ChromaModule } from '../chroma/chroma.module';
import { SoftwareModule } from '../software/software.module';

@Module({
  imports: [
    OllamaModule,
    ChromaModule,
    SoftwareModule,
  ],
  controllers: [IntentController],
  providers: [IntentService],
  exports: [IntentService],
})
export class IntentModule {} 