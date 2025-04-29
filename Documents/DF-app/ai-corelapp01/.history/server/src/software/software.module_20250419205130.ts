import { Module } from '@nestjs/common';
import { BlenderService } from './blender.service';
import { CorelDrawService } from './coreldraw.service';
import { CorelService } from './corel.service';
import { SoftwareController } from './software.controller';
import { SoftwareCommandService } from './commands/software-command.service';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlenderContextAnalyzer } from './context/blender-context';
import { CorelContextAnalyzer } from './context/corel-context';
import { CorelDrawObjectModel } from './universal/coreldraw-object-model';
import { BlenderObjectModel } from './universal/blender-object-model';
import { CorelDrawCodeExecutor, BlenderCodeExecutor, CodeExecutorFactory } from './universal/code-executor';
import { DesignConceptMapper } from './universal/design-concepts';
import { ContextGateway } from './context/context.gateway';
import { ConfigModule } from '@nestjs/config';
import { SoftwareService } from './software.service';
import { OllamaModule } from '../ollama/ollama.module';
import { CorelDrawCommandsService } from './commands/corel-commands.service';
import { BlenderCommandsService } from './commands/blender-commands.service';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { ContextAwareCommandAdapter } from './context/context-aware-command-adapter';
import { ContextAwareQueryService } from './context/context-aware-query.service';
import { PlatformSwitchingService } from './platform-switching.service';
import { DesignContextAnalyzerService } from './context/design-context-analyzer.service';
import { EnhancedContextQueryService } from './context/enhanced-context-query.service';
import { ProofOfConceptIntegration } from './proof-of-concept.integration';
import { ProofOfConceptController } from './proof-of-concept.controller';
import { ParameterSuggestionService } from './context/parameter-suggestion.service';
import { ChromaModule } from '../chroma/chroma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OllamaModule,
    ChromaModule,
  ],
  controllers: [SoftwareController, ProofOfConceptController],
  providers: [
    // Base services
    BlenderService,
    CorelDrawService,
    CorelService,
    SoftwareCommandService,
    SoftwareService,
    
    // Context analyzers
    BlenderContextAnalyzer,
    CorelContextAnalyzer,
    ContextGateway,
    ContextAwareQueryService,
    DesignContextAnalyzerService,
    EnhancedContextQueryService,
    ParameterSuggestionService,
    
    // Universal object model
    CorelDrawObjectModel,
    BlenderObjectModel,
    ObjectModelCommandAdapter,
    ContextAwareCommandAdapter,
    
    // Code executors
    CorelDrawCodeExecutor,
    BlenderCodeExecutor,
    CodeExecutorFactory,
    
    // Design concepts
    DesignConceptMapper,
    
    // Platform switching
    PlatformSwitchingService,
    
    // Command services
    CorelDrawCommandsService,
    BlenderCommandsService,
    CommandFactoryService,
    
    // Proof of Concept
    ProofOfConceptIntegration
  ],
  exports: [
    // Base services
    BlenderService,
    CorelDrawService,
    CorelService,
    SoftwareCommandService,
    SoftwareService,
    
    // Context analyzers
    BlenderContextAnalyzer,
    CorelContextAnalyzer,
    ContextGateway,
    ContextAwareQueryService,
    DesignContextAnalyzerService,
    EnhancedContextQueryService,
    ParameterSuggestionService,
    
    // Universal object model
    CorelDrawObjectModel,
    BlenderObjectModel,
    ObjectModelCommandAdapter,
    ContextAwareCommandAdapter,
    
    // Code executors
    CodeExecutorFactory,
    
    // Design concepts
    DesignConceptMapper,
    
    // Platform switching
    PlatformSwitchingService,
    
    // Command services
    CorelDrawCommandsService,
    BlenderCommandsService,
    CommandFactoryService,
    
    // Proof of Concept
    ProofOfConceptIntegration
  ],
})
export class SoftwareModule {} 