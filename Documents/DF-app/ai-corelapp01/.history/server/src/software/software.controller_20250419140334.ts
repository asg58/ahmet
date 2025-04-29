import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpException, BadRequestException, Logger } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { SoftwareService } from './software.service';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { ChatMessage } from '../ollama/ollama.service';
import { ContextAwareQueryService } from './context/context-aware-query.service';
import { PlatformSwitchingService, PlatformSwitchParams } from './platform-switching.service';

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
    private readonly objectModelAdapter: ObjectModelCommandAdapter,
    private readonly contextAwareQueryService: ContextAwareQueryService,
    private readonly platformSwitchingService: PlatformSwitchingService
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

  /**
   * Get a text description of the current design context
   */
  @Get('context/:platform/description')
  async getContextDescription(@Param('platform') platform: string) {
    this.logger.debug(`Getting context description for platform: ${platform}`);
    
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const context = await this.softwareService.getDesignContext(platform as 'coreldraw' | 'blender');
      
      let description: string;
      if (platform === 'coreldraw') {
        const contextAnalyzer = this.softwareService['corelContextAnalyzer'];
        description = contextAnalyzer.contextToDescription(context);
      } else {
        const contextAnalyzer = this.softwareService['blenderContextAnalyzer'];
        description = contextAnalyzer.contextToDescription(context);
      }
      
      return {
        platform,
        description,
        timestamp: new Date().toISOString(),
        documentName: context.documentName,
        statistics: context.statistics
      };
    } catch (error) {
      this.logger.error(`Error getting context description: ${error.message}`);
      throw new HttpException(
        `Failed to get context description: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Enhance a query with context information
   */
  @Post(':platform/context-query')
  async enhanceQueryWithContext(
    @Param('platform') platform: string,
    @Body() queryData: { 
      query: string;
      includeHistory?: boolean;
    }
  ) {
    this.logger.debug(`Enhancing query with context for platform: ${platform}`);
    
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const context = await this.softwareService.getDesignContext(platform as 'coreldraw' | 'blender');
      const enhancedQuery = this.contextAwareQueryService.enhanceQueryWithContext(queryData.query, context);
      
      return {
        originalQuery: queryData.query,
        enhancedQuery,
        contextInfo: {
          documentName: context.documentName,
          platform,
          selectedElements: context.selectedElements.length,
          totalElements: context.statistics?.totalElements || 0
        }
      };
    } catch (error) {
      this.logger.error(`Error enhancing query with context: ${error.message}`);
      throw new HttpException(
        `Failed to enhance query: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Switch between platforms with context preservation
   */
  @Post('switch-platform')
  async switchPlatform(
    @Body() switchData: {
      sourcePlatform: 'coreldraw' | 'blender';
      targetPlatform: 'coreldraw' | 'blender';
      transferElements?: boolean;
      transferMaterials?: boolean;
      conversationContext?: ChatMessage[];
    }
  ) {
    this.logger.debug(`Switching from ${switchData.sourcePlatform} to ${switchData.targetPlatform}`);
    
    const { sourcePlatform, targetPlatform, transferElements, transferMaterials, conversationContext } = switchData;
    
    // Validate platforms
    if (sourcePlatform !== 'coreldraw' && sourcePlatform !== 'blender') {
      throw new BadRequestException(`Unsupported source platform: ${sourcePlatform}`);
    }
    
    if (targetPlatform !== 'coreldraw' && targetPlatform !== 'blender') {
      throw new BadRequestException(`Unsupported target platform: ${targetPlatform}`);
    }
    
    if (sourcePlatform === targetPlatform) {
      throw new BadRequestException('Source and target platforms must be different');
    }
    
    try {
      // Get the source context
      const sourceContext = await this.softwareService.getDesignContext(sourcePlatform);
      
      // Prepare switch parameters
      const switchParams: PlatformSwitchParams = {
        sourceContext,
        targetPlatform,
        transferElements,
        transferMaterials,
        conversationContext
      };
      
      // Execute the platform switch
      const result = await this.platformSwitchingService.switchPlatform(switchParams);
      
      return {
        success: result.success,
        sourcePlatform,
        targetPlatform,
        transferredElements: result.transferredElements.length,
        commandsGenerated: result.commandsGenerated,
        error: result.error,
        sourceContext: {
          documentName: result.sourceContext.documentName,
          selectedElements: result.sourceContext.selectedElements.length,
          totalElements: result.sourceContext.statistics?.totalElements || 0
        },
        targetContext: result.targetContext ? {
          documentName: result.targetContext.documentName,
          selectedElements: result.targetContext.selectedElements.length,
          totalElements: result.targetContext.statistics?.totalElements || 0
        } : null
      };
    } catch (error) {
      this.logger.error(`Error switching platforms: ${error.message}`);
      throw new HttpException(
        `Failed to switch platforms: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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