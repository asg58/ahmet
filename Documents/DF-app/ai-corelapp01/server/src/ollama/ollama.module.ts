import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { OllamaController } from './ollama.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  controllers: [OllamaController],
  providers: [OllamaService],
  exports: [OllamaService]
})
export class OllamaModule {} 