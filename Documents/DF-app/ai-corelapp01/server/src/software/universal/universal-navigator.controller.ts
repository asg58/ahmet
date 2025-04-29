import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  HttpException, 
  HttpStatus,
  Logger
} from '@nestjs/common';
import { UniversalNavigatorService } from './universal-navigator.service';
import { ObjectDescriptor, PropertyResult, MethodResult } from './universal-object-model';

@Controller('api/object-model')
export class UniversalNavigatorController {
  private readonly logger = new Logger(UniversalNavigatorController.name);
  
  constructor(private readonly navigatorService: UniversalNavigatorService) {}
  
  @Get(':platform/root-objects')
  async getRootObjects(@Param('platform') platform: string) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    try {
      const objectModel = this.navigatorService.getObjectModel(platform as 'coreldraw' | 'blender');
      const rootObjects = await objectModel.getRootObjects();
      
      return {
        platform,
        rootObjects,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting root objects: ${error.message}`);
      throw new HttpException(
        `Failed to get root objects: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get(':platform/explore')
  async exploreObjectModel(
    @Param('platform') platform: string,
    @Query('path') path?: string,
    @Query('maxDepth') maxDepth?: string
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    const depth = maxDepth ? parseInt(maxDepth, 10) : 2;
    if (isNaN(depth) || depth < 1 || depth > 5) {
      throw new HttpException('maxDepth must be a number between 1 and 5', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const objects = await this.navigatorService.exploreObjectModel(
        platform as 'coreldraw' | 'blender',
        path,
        depth
      );
      
      return {
        platform,
        path: path || 'root',
        maxDepth: depth,
        objects,
        count: objects.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error exploring object model: ${error.message}`);
      throw new HttpException(
        `Failed to explore object model: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get(':platform/search')
  async searchObjects(
    @Param('platform') platform: string,
    @Query('query') query: string
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    if (!query || query.trim() === '') {
      throw new HttpException('Search query is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const objects = await this.navigatorService.searchObjects(
        platform as 'coreldraw' | 'blender',
        query
      );
      
      return {
        platform,
        query,
        objects,
        count: objects.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error searching objects: ${error.message}`);
      throw new HttpException(
        `Failed to search objects: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get(':platform/object')
  async getObjectDescriptor(
    @Param('platform') platform: string,
    @Query('path') path: string
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    if (!path || path.trim() === '') {
      throw new HttpException('Object path is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const objectModel = this.navigatorService.getObjectModel(platform as 'coreldraw' | 'blender');
      const descriptor = await objectModel.getObjectDescriptor(path);
      
      return {
        platform,
        path,
        descriptor,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting object descriptor: ${error.message}`);
      throw new HttpException(
        `Failed to get object descriptor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get(':platform/property')
  async getProperty(
    @Param('platform') platform: string,
    @Query('path') objectPath: string,
    @Query('property') propertyName: string,
    @Query('targetType') targetType?: string
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    if (!objectPath || objectPath.trim() === '') {
      throw new HttpException('Object path is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!propertyName || propertyName.trim() === '') {
      throw new HttpException('Property name is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const result = await this.navigatorService.getPropertyValue(
        platform as 'coreldraw' | 'blender',
        objectPath,
        propertyName,
        targetType
      );
      
      return {
        platform,
        objectPath,
        propertyName,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting property: ${error.message}`);
      throw new HttpException(
        `Failed to get property: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':platform/property')
  async setProperty(
    @Param('platform') platform: string,
    @Body() body: {
      objectPath: string;
      propertyName: string;
      value: any;
      sourceType?: string;
    }
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    const { objectPath, propertyName, value, sourceType } = body;
    
    if (!objectPath || objectPath.trim() === '') {
      throw new HttpException('Object path is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!propertyName || propertyName.trim() === '') {
      throw new HttpException('Property name is required', HttpStatus.BAD_REQUEST);
    }
    
    if (value === undefined) {
      throw new HttpException('Property value is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const result = await this.navigatorService.setPropertyValue(
        platform as 'coreldraw' | 'blender',
        objectPath,
        propertyName,
        value,
        sourceType
      );
      
      return {
        platform,
        objectPath,
        propertyName,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error setting property: ${error.message}`);
      throw new HttpException(
        `Failed to set property: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':platform/method')
  async invokeMethod(
    @Param('platform') platform: string,
    @Body() body: {
      objectPath: string;
      methodName: string;
      args: any[];
    }
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    const { objectPath, methodName, args } = body;
    
    if (!objectPath || objectPath.trim() === '') {
      throw new HttpException('Object path is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!methodName || methodName.trim() === '') {
      throw new HttpException('Method name is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!Array.isArray(args)) {
      throw new HttpException('Arguments must be an array', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const result = await this.navigatorService.invokeMethod(
        platform as 'coreldraw' | 'blender',
        objectPath,
        methodName,
        args
      );
      
      return {
        platform,
        objectPath,
        methodName,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error invoking method: ${error.message}`);
      throw new HttpException(
        `Failed to invoke method: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':platform/concept')
  async createFromConcept(
    @Param('platform') platform: string,
    @Body() body: {
      concept: string;
      parameters: Record<string, any>;
    }
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    const { concept, parameters } = body;
    
    if (!concept || concept.trim() === '') {
      throw new HttpException('Concept is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!parameters || typeof parameters !== 'object') {
      throw new HttpException('Parameters must be an object', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const result = await this.navigatorService.createFromConcept(
        concept,
        platform as 'coreldraw' | 'blender',
        parameters
      );
      
      return {
        platform,
        concept,
        parameters,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error creating from concept: ${error.message}`);
      throw new HttpException(
        `Failed to create from concept: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':platform/natural-language')
  async executeNaturalLanguageCommand(
    @Param('platform') platform: string,
    @Body() body: {
      command: string;
    }
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    const { command } = body;
    
    if (!command || command.trim() === '') {
      throw new HttpException('Command is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const result = await this.navigatorService.executeNaturalLanguageCommand(
        command,
        platform as 'coreldraw' | 'blender'
      );
      
      return {
        platform,
        command,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error executing natural language command: ${error.message}`);
      throw new HttpException(
        `Failed to execute command: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':platform/batch')
  async executeBatch(
    @Param('platform') platform: string,
    @Body() body: {
      operations: Array<{
        type: 'getProperty' | 'setProperty' | 'invokeMethod';
        objectPath: string;
        name: string;
        args?: any[];
      }>;
    }
  ) {
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    const { operations } = body;
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      throw new HttpException('Operations array is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const results = await this.navigatorService.executeBatch(
        platform as 'coreldraw' | 'blender',
        operations
      );
      
      return {
        platform,
        operations,
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error executing batch operations: ${error.message}`);
      throw new HttpException(
        `Failed to execute batch: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':platform/clear-cache')
  async clearCache(@Param('platform') platform: string) {
    if (platform !== 'coreldraw' && platform !== 'blender' && platform !== 'all') {
      throw new HttpException(`Unsupported platform: ${platform}`, HttpStatus.BAD_REQUEST);
    }
    
    try {
      if (platform === 'all') {
        this.navigatorService.clearCache();
      } else {
        this.navigatorService.clearPlatformCache(platform as 'coreldraw' | 'blender');
      }
      
      return {
        platform,
        message: `Cache cleared for ${platform}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`);
      throw new HttpException(
        `Failed to clear cache: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 