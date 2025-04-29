import { Module } from '@nestjs/common';
import { BlenderService } from './blender.service';
import { CorelDrawService } from './coreldraw.service';
import { CorelService } from './corel.service';
import { SoftwareController } from './software.controller';
import { SoftwareService } from './software.service';
import { ContextAwareCommandAdapter } from './context/context-aware-command-adapter';
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
import { ChromaModule } from '../chroma/chroma.module';
import { OllamaModule } from '../ollama/ollama.module';
import { ObjectExplorer } from './universal/object-explorer';
import { TypeConversionService } from './universal/type-conversion.service';
import { ParameterValidationService } from './universal/parameter-validation.service';
import { ConceptMappingService } from './universal/concept-mapping.service';
import { UniversalNavigatorService } from './universal/universal-navigator.service';
import { UniversalNavigatorController } from './universal/universal-navigator.controller';
import { CodeValidationService } from './code-validation.service';
import { DockerService } from './docker/docker.service';
import { CorelContextAnalyzer } from './context/corel-context';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { BlenderContextAnalyzer } from './context/blender-context';
import { ContextAwareQueryService } from './context/context-aware-query.service';
import { DesignContextAnalyzer } from './context/design-context';
import { DesignConceptMapper } from './universal/design-concepts';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CorelDrawObjectModel } from './universal/coreldraw-object-model';
import { BlenderObjectModel } from './universal/blender-object-model';

@Module({
  imports: [
    DatabaseModule,
    DiscoveryModule,
    ChromaModule,
    OllamaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    SoftwareController,
    ProofOfConceptController,
    UniversalNavigatorController
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
    ProofOfConceptIntegration,
    ObjectExplorer,
    TypeConversionService,
    ParameterValidationService,
    ConceptMappingService,
    UniversalNavigatorService,
    CodeValidationService,
    DockerService,
    CorelContextAnalyzer,
    CommandFactoryService,
    ObjectModelCommandAdapter,
    BlenderContextAnalyzer,
    ContextAwareQueryService,
    DesignConceptMapper,
    CorelDrawObjectModel,
    BlenderObjectModel,
    {
      provide: DesignContextAnalyzer,
      useClass: CorelContextAnalyzer
    },
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
    ProofOfConceptIntegration,
    ObjectExplorer,
    TypeConversionService,
    ParameterValidationService,
    ConceptMappingService,
    UniversalNavigatorService,
    CodeValidationService,
    DockerService,
    CorelContextAnalyzer,
    CommandFactoryService,
    ObjectModelCommandAdapter,
    BlenderContextAnalyzer,
    ContextAwareQueryService,
    DesignConceptMapper,
    CorelDrawObjectModel,
    BlenderObjectModel,
    DesignContextAnalyzer
  ],
})
export class SoftwareModule {} 