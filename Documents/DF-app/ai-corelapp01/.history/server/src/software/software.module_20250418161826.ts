import { Module } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [OllamaModule],
  providers: [SoftwareService, CorelDrawService, BlenderService],
  exports: [SoftwareService],
})
export class SoftwareModule {} 