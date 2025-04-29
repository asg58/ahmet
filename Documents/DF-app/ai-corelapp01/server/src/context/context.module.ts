/**
 * Context Module
 * 
 * This module provides context-aware functionality for the application.
 * It integrates with the software module to provide context from different
 * design platforms and enhances AI functionality with context awareness.
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChromaModule } from '../chroma/chroma.module';

import { SoftwareModule } from '../software/software.module';
import { DatabaseModule } from '../database/database.module';

import { CorelDrawContextTracker } from './coreldraw-context-tracker';
import { BlenderContextTracker } from './blender-context-tracker';
import { ContextAnalyzerService } from './context-analyzer.service';
import { ContextController } from './context.controller';
import { ParameterSuggestionService } from './parameter-suggestion.service';
import { ContextualValidatorService } from './contextual-validator.service';

/**
 * Module for context tracking and analysis
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SoftwareModule,
    DatabaseModule,
    ChromaModule,
  ],
  providers: [
    CorelDrawContextTracker,
    BlenderContextTracker,
    ContextAnalyzerService,
    ParameterSuggestionService,
    ContextualValidatorService,
  ],
  controllers: [ContextController],
  exports: [
    ContextAnalyzerService,
    ParameterSuggestionService,
    ContextualValidatorService,
  ]
})
export class ContextModule {} 