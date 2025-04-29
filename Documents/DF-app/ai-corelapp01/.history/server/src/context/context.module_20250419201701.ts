/**
 * Context Module
 * 
 * This module provides context-aware functionality for the application.
 * It integrates with the software module to provide context from different
 * design platforms and enhances AI functionality with context awareness.
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { SoftwareModule } from '../software/software.module';
import { DatabaseModule } from '../database/database.module';

import { CorelDrawContextTracker } from './coreldraw-context-tracker';
import { BlenderContextTracker } from './blender-context-tracker';
import { ContextAnalyzerService } from './context-analyzer.service';
import { ContextController } from './context.controller';

/**
 * Module for context tracking and analysis
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SoftwareModule,
    DatabaseModule
  ],
  providers: [
    CorelDrawContextTracker,
    BlenderContextTracker,
    ContextAnalyzerService
  ],
  controllers: [ContextController],
  exports: [ContextAnalyzerService]
})
export class ContextModule {} 