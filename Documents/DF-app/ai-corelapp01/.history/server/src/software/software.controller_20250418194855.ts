import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { SoftwareService } from './software.service';

/**
 * Controller for software-related endpoints
 */
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

  /**
   * Get status of Blender connection
   */
  @Get('blender/status')
  async getBlenderStatus() {
    try {
      const status = await this.blenderService.getStatus();
      return { status };
    } catch (error) {
      throw new HttpException(
        `Failed to get Blender status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Execute code in Blender
   */
  @Post('blender/execute')
  async executeBlenderCode(@Body() body: { code: string, options?: any }) {
    try {
      const result = await this.blenderService.executeCode(body.code, body.options);
      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to execute Blender code: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get status of CorelDRAW connection
   */
  @Get('coreldraw/status')
  async getCorelDrawStatus() {
    try {
      const status = await this.corelDrawService.getStatus();
      return { status };
    } catch (error) {
      throw new HttpException(
        `Failed to get CorelDRAW status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Execute code in CorelDRAW
   */
  @Post('coreldraw/execute')
  async executeCorelDrawCode(@Body() body: { code: string, options?: any }) {
    try {
      const result = await this.corelDrawService.executeCode(body.code, body.options);
      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to execute CorelDRAW code: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get available software platforms
   */
  @Get('available')
  async getAvailableSoftware() {
    const blenderAvailable = await this.blenderService.getStatus()
      .then(status => status.connected)
      .catch(() => false);
    
    const corelDrawAvailable = await this.corelDrawService.getStatus()
      .then(status => status.connected)
      .catch(() => false);
    
    return {
      platforms: {
        blender: blenderAvailable,
        coreldraw: corelDrawAvailable
      }
    };
  }
} 