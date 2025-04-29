import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { IntentModule } from './intent/intent.module';
import { OllamaModule } from './ollama/ollama.module';
import { ChromaModule } from './chroma/chroma.module';
import { SoftwareModule } from './software/software.module';

@Module({
  imports: [
    ChatModule,
    IntentModule,
    OllamaModule,
    ChromaModule,
    SoftwareModule,
  ],
})
export class AppModule {} 