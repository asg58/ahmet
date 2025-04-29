import { Module } from '@nestjs/common';
import { BlenderService } from './blender.service';
import { CorelDrawService } from './coreldraw.service';
import { CorelService } from './corel.service';
import { SoftwareController } from './software.controller';
import { SoftwareService } from './software.service';
import { ContextAwareCommandAdapter } from './commands/context-aware-command-adapter.service';
import { DatabaseModule } from '../database/database.module';
import { PlatformSwitchingService } from './platform-switching.service';
import { DiscoveryModule } from '@nestjs/core';
import { SoftwareCommandService } from './commands/software-command.service';
import { UniversalActionService } from './universal/universal-action.service';
import { UniversalCommandBuilder } from './universal/universal-command-builder.service';
import { SoftwareContextService } from './context/software-context.service';
import { DesignContextAnalyzerService } from './context/design-context-analyzer.service';
import { ParameterSuggestionService } from './context/parameter-suggestion.service';
import { EnhancedContextQueryService } from './context/enhanced-context-query.service';
import { ContextualValidatorService } from './context/contextual-validator.service';
import { ProofOfConceptIntegration } from './proof-of-concept.integration';
import { ProofOfConceptController } from './proof-of-concept.controller';

@Module({
  imports: [
    DatabaseModule,
    DiscoveryModule,
  ],
  controllers: [
    SoftwareController,
    ProofOfConceptController
  ],
  providers: [
    SoftwareService,
    BlenderService,
    CorelDrawService,
    CorelService,
    SoftwareCommandService,
    ContextAwareCommandAdapter,
    PlatformSwitchingService,
    UniversalActionService,
    UniversalCommandBuilder,
    SoftwareContextService,
    DesignContextAnalyzerService,
    ParameterSuggestionService,
    EnhancedContextQueryService,
    ContextualValidatorService,
    ProofOfConceptIntegration
  ],
  exports: [
    SoftwareService,
    BlenderService,
    CorelDrawService,
    CorelService,
    SoftwareCommandService,
    ContextAwareCommandAdapter,
    PlatformSwitchingService,
    UniversalActionService,
    UniversalCommandBuilder,
    SoftwareContextService,
    DesignContextAnalyzerService,
    ParameterSuggestionService,
    EnhancedContextQueryService,
    ContextualValidatorService,
    ProofOfConceptIntegration
  ],
})
export class SoftwareModule {} 