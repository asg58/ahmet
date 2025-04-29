import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OllamaModule } from '../ollama/ollama.module';
import { IntentModule } from '../intent/intent.module';
import { SoftwareModule } from '../software/software.module';
import { ChromaModule } from '../chroma/chroma.module';

@Module({
  imports: [OllamaModule, IntentModule, SoftwareModule, ChromaModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {} 