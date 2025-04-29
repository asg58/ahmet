import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawCommandsService } from './corel-commands.service';
import { BlenderCommandsService } from './blender-commands.service';
import { CommandResult, SupportedPlatform } from './command.types';

// Type definitions voor Blender parameters om type-checking te verbeteren
interface ApplyMaterialParams {
  objectName: string;
  material?: {
    name?: string;
    color?: [number, number, number];
    metallic?: number;
    roughness?: number;
    specular?: number;
    transmission?: number;
    emission?: [number, number, number];
    emissionStrength?: number;
  };
}

interface AddTextureParams {
  objectName: string;
  textureType?: 'COLOR' | 'ROUGHNESS' | 'NORMAL' | 'BUMP' | 'DISPLACEMENT';
  texturePath?: string;
  procedural?: {
    type?: 'NOISE' | 'VORONOI' | 'MUSGRAVE' | 'WAVE' | 'CHECKER';
    scale?: number;
    detail?: number;
    distortion?: number;
  };
}

// Keeping CommandExecutionResult for backward compatibility
export type CommandExecutionResult = CommandResult;

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
    platform: SupportedPlatform,
    action: string,
    params: Record<string, any> = {}
  ): Promise<CommandResult> {
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
  ): Promise<CommandResult> {
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
  ): Promise<CommandResult> {
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
      
      case 'lighting':
      case 'setup_lighting':
        return await this.blenderCommands.setupLighting(params);
      
      case 'material':
      case 'apply_material':
        // Check if objectName is present for required parameters
        if (!params.objectName) {
          return {
            success: false,
            error: 'Missing required parameter: objectName for apply_material'
          };
        }
        return await this.blenderCommands.applyMaterial(params as ApplyMaterialParams);
      
      case 'texture':
      case 'add_texture':
        // Check if objectName is present for required parameters
        if (!params.objectName) {
          return {
            success: false,
            error: 'Missing required parameter: objectName for add_texture'
          };
        }
        return await this.blenderCommands.addTexture(params as AddTextureParams);
      
      case 'render':
      case 'render_scene':
        return await this.blenderCommands.renderScene(params);
      
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
  getAvailableCommands(platform: SupportedPlatform): string[] {
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
        'setup_lighting',
        'apply_material',
        'add_texture',
        'render_scene',
        'select_objects',
        'get_screenshot'
      ];
    } else {
      return [];
    }
  }
} 