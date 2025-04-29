import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpException, BadRequestException, Logger } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { SoftwareService } from './software.service';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { ChatMessage } from '../ollama/ollama.service';

/**
 * Controller for software-related endpoints
 */
@Controller('api/software')
export class SoftwareController {
  private readonly logger = new Logger(SoftwareController.name);

  constructor(
    private readonly softwareService: SoftwareService,
    private readonly corelDrawService: CorelDrawService,
    private readonly blenderService: BlenderService,
    private readonly commandFactory: CommandFactoryService,
    private readonly objectModelAdapter: ObjectModelCommandAdapter
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
   * Execute an action using the software service
   * This method uses context-aware execution with fallbacks
   */
  @Post(':platform/action')
  async executeAction(
    @Param('platform') platform: string,
    @Body() actionData: { 
      action: string;
      parameters: Record<string, any>;
      conversationContext?: ChatMessage[];
    },
  ) {
    this.logger.debug(`Executing action on ${platform}: ${actionData.action}`);
    
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const result = await this.softwareService.executeAction(
        platform as 'coreldraw' | 'blender',
        actionData.action,
        actionData.parameters || {},
        actionData.conversationContext || [],
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Error executing action: ${error.message}`);
      throw new HttpException(
        `Failed to execute action: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Execute an action directly via the UniversalObjectModel
   * This endpoint is more direct and doesn't use the fallback mechanisms
   */
  @Post(':platform/object-action')
  async executeObjectModelAction(
    @Param('platform') platform: string,
    @Body() actionData: { 
      action: string;
      parameters: Record<string, any>;
    },
  ) {
    this.logger.debug(`Executing object model action on ${platform}: ${actionData.action}`);
    
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const result = await this.objectModelAdapter.executeCommandViaObjectModel(
        platform as 'coreldraw' | 'blender',
        actionData.action,
        actionData.parameters || {},
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Error executing object model action: ${error.message}`);
      throw new HttpException(
        `Failed to execute action via object model: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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

  /**
   * Get available commands for a platform
   */
  @Get(':platform/commands')
  async getAvailableCommands(@Param('platform') platform: string) {
    this.logger.debug(`Getting available commands for platform: ${platform}`);
    
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    return {
      platform,
      commands: this.commandFactory.getAvailableCommands(platform as 'coreldraw' | 'blender')
    };
  }
} 