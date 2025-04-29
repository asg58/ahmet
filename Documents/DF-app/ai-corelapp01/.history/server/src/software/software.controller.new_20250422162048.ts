import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { SoftwareService } from './software.service';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { ChatMessage } from '../ollama/ollama.service';
import { ContextAwareQueryService } from './context/context-aware-query.service';
import { PlatformSwitchingService, PlatformSwitchParams } from './platform-switching.service';
import { ContextAwareCommandAdapter } from './universal/context-aware-adapter';

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
    private readonly platformSwitchingService: PlatformSwitchingService,
    private readonly contextAwareAdapter: ContextAwareCommandAdapter
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
   * Execute a action on a platform
   */
  @Post('action/:platform')
  async executeAction(
    @Param('platform') platform: string,
    @Body() actionData: { 
      action: string;
      parameters: Record<string, any>;
      conversationContext?: ChatMessage[];
    },
  ) {
    this.logger.log(`Executing action ${actionData.action} on ${platform}`);
    
    try {
      const result = await this.softwareService.executeAction(
        platform as 'coreldraw' | 'blender',
        actionData.action,
        actionData.parameters,
        actionData.conversationContext
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
   * Execute an action via the object model adapter
   */
  @Post('object-model/:platform')
  async executeObjectModelAction(
    @Param('platform') platform: string,
    @Body() actionData: { 
      action: string;
      parameters: Record<string, any>;
    },
  ) {
    this.logger.log(`Executing object model action ${actionData.action} on ${platform}`);
    
    try {
      const result = await this.objectModelAdapter.executeCommandViaObjectModel(
        platform as 'coreldraw' | 'blender',
        actionData.action,
        actionData.parameters
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Error executing object model action: ${error.message}`);
      throw new HttpException(
        `Failed to execute object model action: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Blender status
   */
  @Get('blender/status')
  async getBlenderStatus() {
    this.logger.debug('Getting Blender status');
    
    try {
      const status = await this.blenderService.getStatus();
      
      return {
        connected: status.connected,
        version: status.connected ? 'Blender API v1.0' : undefined,
        message: status.connected ? 'Connected to Blender' : 'Not connected to Blender',
        endpoints: {
          rest: status.endpoint,
          ws: status.wsEndpoint
        }
      };
    } catch (error) {
      this.logger.error(`Error getting Blender status: ${error.message}`);
      return {
        connected: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Execute Blender code
   */
  @Post('blender/execute')
  async executeBlenderCode(@Body() body: { code: string, options?: any }) {
    this.logger.debug('Executing Blender code');
    
    try {
      const result = await this.blenderService.executeCode(body.code);
      return result;
    } catch (error) {
      this.logger.error(`Error executing Blender code: ${error.message}`);
      throw new HttpException(
        `Failed to execute code: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get CorelDRAW status
   */
  @Get('coreldraw/status')
  async getCorelDrawStatus() {
    this.logger.debug('Getting CorelDRAW status');
    
    try {
      const isConnected = await this.corelDrawService.checkConnection();
      
      return {
        connected: isConnected,
        version: isConnected ? 'CorelDRAW 2022' : undefined,
        message: isConnected ? 'Connected to CorelDRAW' : 'Not connected to CorelDRAW'
      };
    } catch (error) {
      this.logger.error(`Error getting CorelDRAW status: ${error.message}`);
      return {
        connected: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Execute CorelDRAW code
   */
  @Post('coreldraw/execute')
  async executeCorelDrawCode(@Body() body: { code: string, options?: any }) {
    this.logger.debug('Executing CorelDRAW code');
    
    try {
      const result = await this.corelDrawService.executeCommand(body.code, body.options || {});
      return result;
    } catch (error) {
      this.logger.error(`Error executing CorelDRAW code: ${error.message}`);
      throw new HttpException(
        `Failed to execute code: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get available software platforms
   */
  @Get('platforms')
  async getAvailablePlatforms() {
    this.logger.debug('Getting available platforms');
    
    try {
      const platforms = await this.softwareService.getAvailablePlatforms();
      
      return {
        platforms: Object.keys(platforms).filter(platform => platforms[platform]),
        details: platforms,
        count: Object.values(platforms).filter(Boolean).length
      };
    } catch (error) {
      this.logger.error(`Error getting available platforms: ${error.message}`);
      throw new HttpException(
        `Failed to get available platforms: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get available commands for a platform
   */
  @Get('commands/:platform')
  async getAvailableCommands(@Param('platform') platform: string) {
    this.logger.debug(`Getting available commands for platform: ${platform}`);
    
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const commands = this.commandFactory.getAvailableCommands(platform as 'coreldraw' | 'blender');
      
      return {
        platform,
        commands,
        count: commands.length
      };
    } catch (error) {
      this.logger.error(`Error getting available commands: ${error.message}`);
      throw new HttpException(
        `Failed to get available commands: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Execute an action with context awareness on the specified platform
   */
  @Post('/context-aware/:platform')
  async executeContextAwareAction(
    @Param('platform') platform: string,
    @Body() body: { action: string; params?: Record<string, any> }
  ) {
    this.logger.log(`Execute context-aware action on ${platform}: ${body.action}`);
    
    // Validate platform
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const result = await this.contextAwareAdapter.executeContextAwareCommand(
        platform as 'coreldraw' | 'blender',
        body.action,
        body.params || {}
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Error executing context-aware action: ${error.message}`);
      throw new InternalServerErrorException(`Error executing action: ${error.message}`);
    }
  }
} 