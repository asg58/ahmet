import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { SoftwareService } from './software.service';

@Controller('api/software')
export class SoftwareController {
  constructor(
    private readonly softwareService: SoftwareService,
    private readonly corelDrawService: CorelDrawService,
    private readonly blenderService: BlenderService,
  ) {}

  @Get('status')
  async getStatus() {
    return {
      status: 'running',
      platforms: await this.softwareService.getAvailablePlatforms(),
    };
  }

  @Get('context/:platform')
  async getDesignContext(@Param('platform') platform: string) {
    return this.softwareService.getDesignContext(platform as 'coreldraw' | 'blender');
  }

  @Post('execute/:platform')
  async executeCommand(
    @Param('platform') platform: string,
    @Body() commandData: { command: string },
  ) {
    return this.softwareService.executeCommand(
      platform as 'coreldraw' | 'blender',
      commandData.command,
    );
  }

  @Get('coreldraw/status')
  async getCorelDrawStatus() {
    return this.corelDrawService.getStatus();
  }

  @Get('blender/status')
  async getBlenderStatus() {
    return this.blenderService.getStatus();
  }
} 