import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { OllamaModule } from './ollama/ollama.module';
import { ChromaModule } from './chroma/chroma.module';
import { SoftwareModule } from './software/software.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    EmbeddingsModule,
    OllamaModule,
    ChromaModule,
    ChatModule,
    SoftwareModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 