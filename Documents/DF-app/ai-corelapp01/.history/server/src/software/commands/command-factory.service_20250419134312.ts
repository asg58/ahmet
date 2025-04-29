import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawCommandsService } from './corel-commands.service';
import { BlenderCommandsService } from './blender-commands.service';

export interface CommandExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: any;
  visualData?: {
    type: 'image' | '3d' | 'svg';
    data: string;
  };
}

/**
 * CommandFactoryService
 * 
 * Factory service for executing commands on different platforms
 */
@Injectable()
export class CommandFactoryService {
  private readonly logger = new Logger(CommandFactoryService.name);

  constructor(
    private readonly corelDrawCommands: CorelDrawCommandsService,
    private readonly blenderCommands: BlenderCommandsService,
  ) {}

  /**
   * Execute a command on a specified platform
   */
  async executeCommand(
    platform: 'coreldraw' | 'blender',
    action: string,
    params: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    this.logger.debug(`Executing command on platform ${platform}: ${action} with params: ${JSON.stringify(params)}`);
    
    try {
      if (platform === 'coreldraw') {
        return await this.executeCorelDrawAction(action, params);
      } else if (platform === 'blender') {
        return await this.executeBlenderAction(action, params);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Error executing command: ${error.message}`);
      return {
        success: false,
        error: `Command execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Execute a CorelDRAW action
   */
  private async executeCorelDrawAction(
    action: string,
    params: Record<string, any>
  ): Promise<CommandExecutionResult> {
    this.logger.debug(`Executing CorelDRAW action: ${action}`);
    
    // Map actions to the appropriate CorelDRAW command service method
    switch (action.toLowerCase()) {
      case 'create_rectangle':
      case 'rectangle':
        return await this.corelDrawCommands.createRectangle(params);
      
      case 'create_ellipse':
      case 'ellipse':
      case 'circle':
        return await this.corelDrawCommands.createEllipse(params);
      
      case 'create_text':
      case 'text':
        return await this.corelDrawCommands.createText(params);
      
      case 'create_polygon':
      case 'polygon':
        return await this.corelDrawCommands.createPolygon(params);
      
      case 'select':
      case 'select_objects':
        return await this.corelDrawCommands.selectObjects(params);
      
      case 'group':
      case 'group_objects':
        return await this.corelDrawCommands.groupSelectedObjects();
      
      default:
        return {
          success: false,
          error: `Unknown CorelDRAW action: ${action}`
        };
    }
  }

  /**
   * Execute a Blender action
   */
  private async executeBlenderAction(
    action: string,
    params: Record<string, any>
  ): Promise<CommandExecutionResult> {
    this.logger.debug(`Executing Blender action: ${action}`);
    
    // Map actions to the appropriate Blender command service method
    switch (action.toLowerCase()) {
      case 'create_cube':
      case 'cube':
        return await this.blenderCommands.createCube(params);
      
      case 'create_sphere':
      case 'sphere':
        return await this.blenderCommands.createSphere(params);
      
      case 'create_cylinder':
      case 'cylinder':
        return await this.blenderCommands.createCylinder(params);
      
      case 'create_plane':
      case 'plane':
        return await this.blenderCommands.createPlane(params);
      
      case 'create_text':
      case 'text':
        return await this.blenderCommands.createText(params);
      
      case 'transform':
      case 'transform_object':
        return await this.blenderCommands.transformObject(params);
      
      case 'camera':
      case 'setup_camera':
        return await this.blenderCommands.setupCamera(params);
      
      case 'select':
      case 'select_objects':
        return await this.blenderCommands.selectObjects(params);
      
      case 'screenshot':
      case 'get_screenshot':
        return await this.blenderCommands.getSceneScreenshot();
      
      default:
        return {
          success: false,
          error: `Unknown Blender action: ${action}`
        };
    }
  }
  
  /**
   * Get list of available commands for a platform
   */
  getAvailableCommands(platform: 'coreldraw' | 'blender'): string[] {
    if (platform === 'coreldraw') {
      return [
        'create_rectangle',
        'create_ellipse',
        'create_text',
        'create_polygon',
        'select_objects',
        'group_objects'
      ];
    } else if (platform === 'blender') {
      return [
        'create_cube',
        'create_sphere',
        'create_cylinder',
        'create_plane',
        'create_text',
        'transform_object',
        'setup_camera',
        'select_objects',
        'get_screenshot'
      ];
    } else {
      return [];
    }
  }
} 