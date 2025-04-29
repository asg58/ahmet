/**
 * Database Module
 * 
 * This module provides database services for the application.
 * Currently it exports the ChromaService for vector database functionality.
 */

import { Module } from '@nestjs/common';
import { ChromaModule } from '../chroma/chroma.module';
import { ChromaService } from '../chroma/chroma.service';

@Module({
  imports: [ChromaModule],
  providers: [],
  exports: [ChromaModule]
})
export class DatabaseModule {} 