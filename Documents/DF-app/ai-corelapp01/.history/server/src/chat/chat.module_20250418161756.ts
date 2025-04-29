import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { OllamaModule } from '../ollama/ollama.module';
import { IntentModule } from '../intent/intent.module';
import { SoftwareModule } from '../software/software.module';

@Module({
  imports: [OllamaModule, IntentModule, SoftwareModule],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {} 