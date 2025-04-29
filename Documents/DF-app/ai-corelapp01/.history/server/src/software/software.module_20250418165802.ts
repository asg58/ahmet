import { Module } from '@nestjs/common';
import { BlenderService } from './blender.service';
import { CorelDrawService } from './coreldraw.service';
import { SoftwareController } from './software.controller';
import { SoftwareCommandService } from './commands/software-command.service';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlenderContextAnalyzer } from './context/blender-context';
import { CorelContextAnalyzer } from './context/corel-context';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [SoftwareController],
  providers: [
    BlenderService,
    CorelDrawService,
    SoftwareCommandService,
    BlenderContextAnalyzer,
    CorelContextAnalyzer,
  ],
  exports: [
    BlenderService,
    CorelDrawService,
    SoftwareCommandService,
    BlenderContextAnalyzer,
    CorelContextAnalyzer,
  ],
})
export class SoftwareModule {} 