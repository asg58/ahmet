import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OllamaModule } from '../ollama/ollama.module';
import { IntentModule } from '../intent/intent.module';
import { ChromaModule } from '../chroma/chroma.module';
import { SoftwareModule } from '../software/software.module';
import { TaskModule } from '../task/task.module';
import { ChatMemoryService } from './chat-memory.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    OllamaModule,
    IntentModule,
    ChromaModule,
    SoftwareModule,
    TaskModule
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatMemoryService,
    ConversationOrchestratorService,
    ChatGateway
  ],
  exports: [
    ChatService,
    ChatMemoryService,
    ConversationOrchestratorService,
    ChatGateway
  ]
})
export class ChatModule {} 