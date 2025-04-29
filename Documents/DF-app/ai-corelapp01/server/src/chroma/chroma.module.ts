import { Module } from '@nestjs/common';
import { ChromaService } from './chroma.service';
import { ContextAwareQueryBuilder } from './context-aware-query';

@Module({
  providers: [ChromaService, ContextAwareQueryBuilder],
  exports: [ChromaService, ContextAwareQueryBuilder],
})
export class ChromaModule {} 