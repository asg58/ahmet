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
   * Get Blender models
   */
  @Get('blender/models')
  async getBlenderModels() {
    this.logger.debug('Getting Blender models');
    
    try {
      // Get objects from Blender
      const objects = await this.blenderService.getObjects();
      
      if (!objects.success) {
        throw new HttpException(
          objects.error || 'Failed to get objects from Blender',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      // Transform Blender objects into ModelInfo format
      const models = objects.objects.map(obj => ({
        id: obj.name,
        name: obj.name,
        description: `${obj.type} created in Blender`,
        type: 'model',
        url: `/models/${obj.name}.glb`, // This would need to match a real export path
        thumbnail: `/thumbnails/${obj.name}.png`, // This would need to be generated
      }));
      
      return {
        success: true,
        models,
        count: models.length
      };
    } catch (error) {
      this.logger.error(`Error getting Blender models: ${error.message}`);
      return {
        success: false,
        models: [],
        error: error.message
      };
    }
  }

  /**
   * Render a Blender scene
   */
  @Post('blender/render')
  async renderBlenderScene(@Body() params: any) {
    this.logger.debug('Rendering Blender scene');
    
    try {
      const result = await this.blenderService.renderScene(params);
      
      return {
        success: result.success,
        imageUrl: result.success ? result.imageUrl : undefined,
        error: result.error
      };
    } catch (error) {
      this.logger.error(`Error rendering Blender scene: ${error.message}`);
      throw new HttpException(
        `Failed to render scene: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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
      const status = await this.corelDrawService.getStatus();
      
      return {
        connected: status.connected,
        version: status.connected ? 'CorelDRAW 2022' : undefined,
        message: status.connected ? 'Connected to CorelDRAW' : 'Not connected to CorelDRAW'
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

  /**
   * Get CorelDRAW shapes
   */
  @Get('coreldraw/shapes')
  async getCorelDrawShapes() {
    this.logger.debug('Getting CorelDRAW shapes');
    
    try {
      // Get shapes from CorelDRAW context
      const context = await this.softwareService.getDesignContext('coreldraw');
      
      if (!context) {
        throw new HttpException(
          'Failed to get context from CorelDRAW',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      // Transform CorelDRAW shapes into ModelInfo format for the viewer
      const shapes = context.allElements.map((element: any) => ({
        id: element.id || `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: element.name || 'Unnamed Shape',
        description: `${element.type || 'Shape'} in CorelDRAW`,
        type: 'vector',
        url: `/shapes/${element.id}.svg`, // This would need to match a real export path
        thumbnail: `/thumbnails/${element.id}.png`, // This would need to be generated
        vectorData: this.generateSimpleSvgForShape(element)
      }));
      
      return {
        success: true,
        shapes,
        count: shapes.length
      };
    } catch (error) {
      this.logger.error(`Error getting CorelDRAW shapes: ${error.message}`);
      return {
        success: false,
        shapes: [],
        error: error.message
      };
    }
  }
  
  /**
   * Export a document from CorelDRAW
   */
  @Post('coreldraw/export')
  async exportCorelDrawDocument(@Body() params: {
    format: 'PDF' | 'JPG' | 'PNG' | 'SVG';
    resolution?: number;
    quality?: number;
  }) {
    this.logger.debug(`Exporting CorelDRAW document to ${params.format}`);
    
    try {
      // Execute export command
      const result = await this.softwareService.executeAction(
        'coreldraw',
        'exportDocument',
        params
      );
      
      return {
        success: result.success,
        fileUrl: result.success ? result.data?.fileUrl : undefined,
        format: params.format,
        error: result.error
      };
    } catch (error) {
      this.logger.error(`Error exporting CorelDRAW document: ${error.message}`);
      throw new HttpException(
        `Failed to export document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Generate a simple SVG representation of a CorelDRAW shape
   * This is a placeholder implementation - a real one would create proper SVG based on the shape type
   */
  private generateSimpleSvgForShape(shape: any): string {
    // This is a simplified example - in a real implementation, 
    // you would generate SVG based on the actual shape properties
    if (!shape) return '';
    
    const type = shape.type?.toLowerCase() || 'unknown';
    
    if (type === 'rectangle') {
      return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="80" 
          fill="${shape.fillColor || 'blue'}" 
          stroke="${shape.outlineColor || 'black'}" 
          stroke-width="${shape.outlineWidth || 1}" />
      </svg>`;
    } 
    else if (type === 'ellipse' || type === 'circle') {
      return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="50" rx="40" ry="${type === 'circle' ? '40' : '30'}" 
          fill="${shape.fillColor || 'red'}" 
          stroke="${shape.outlineColor || 'black'}" 
          stroke-width="${shape.outlineWidth || 1}" />
      </svg>`;
    }
    else if (type === 'text' || type === 'artistic_text') {
      return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="50" font-size="${shape.fontSize || 14}" fill="${shape.color || 'black'}">
          ${shape.text || 'Text'}
        </text>
      </svg>`;
    }
    else if (type === 'path' || type === 'curve') {
      return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,30 Q50,10 90,30 T90,60" 
          fill="${shape.fillColor || 'none'}" 
          stroke="${shape.outlineColor || 'black'}" 
          stroke-width="${shape.outlineWidth || 1}" />
      </svg>`;
    }
    else {
      // Generic shape placeholder
      return `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="25" width="50" height="50" 
          fill="gray" stroke="black" stroke-width="1" />
      </svg>`;
    }
  }
} 