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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [SoftwareController],
  providers: [
    // Base services
    BlenderService,
    CorelDrawService,
    CorelService,
    SoftwareCommandService,
    
    // Context analyzers
    BlenderContextAnalyzer,
    CorelContextAnalyzer,
    ContextGateway,
    
    // Universal object model
    CorelDrawObjectModel,
    BlenderObjectModel,
    
    // Code executors
    CorelDrawCodeExecutor,
    BlenderCodeExecutor,
    CodeExecutorFactory,
    
    // Design concepts
    DesignConceptMapper,
  ],
  exports: [
    // Base services
    BlenderService,
    CorelDrawService,
    CorelService,
    SoftwareCommandService,
    
    // Context analyzers
    BlenderContextAnalyzer,
    CorelContextAnalyzer,
    ContextGateway,
    
    // Universal object model
    CorelDrawObjectModel,
    BlenderObjectModel,
    
    // Code executors
    CodeExecutorFactory,
    
    // Design concepts
    DesignConceptMapper,
  ],
})
export class SoftwareModule {} 