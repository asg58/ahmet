import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from '../coreldraw.service';
import { BlenderService } from '../blender.service';
import { CommandResult, CommandOptions, SupportedPlatform } from './command.types';

/**
 * Service for handling high-level software commands
 */
@Injectable()
export class SoftwareCommandService {
  private readonly logger = new Logger(SoftwareCommandService.name);
  
  constructor(
    private readonly corelDrawService: CorelDrawService,
    private readonly blenderService: BlenderService,
  ) {}
  
  /**
   * Execute a high-level design command
   * 
   * @param platform The platform to execute the command on
   * @param command The command to execute
   * @param params Parameters for the command
   * @returns Result of the command
   */
  async executeCommand(
    platform: SupportedPlatform,
    command: string,
    params: Record<string, any> = {}
  ): Promise<CommandResult> {
    this.logger.debug(`Executing command ${command} on ${platform} with params: ${JSON.stringify(params)}`);

    try {
      // Execute command on the appropriate platform
      if (platform === 'coreldraw') {
        return this.corelDrawService.executeCommand(command, params);
      } else if (platform === 'blender') {
        // Convert command to Python code for Blender
        const pythonCode = this.convertCommandToPython(command, params);
        const result = await this.blenderService.executeCode(pythonCode);
        return {
          success: result.success,
          output: result.output,
          error: result.error,
          visualData: result.visualData
        };
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Error executing command: ${error.message}`);
      return {
        success: false,
        error: `Failed to execute command: ${error.message}`,
      };
    }
  }

  /**
   * Convert a command to Python code for Blender
   */
  private convertCommandToPython(command: string, params: Record<string, any>): string {
    this.logger.debug(`Converting command to Python: ${command}`);

    // Basic command to Python conversion
    switch (command.toLowerCase()) {
      case 'create_cube':
      case 'cube':
        const location = params.location || [0, 0, 0];
        const size = params.size || 2;
        return `
import bpy
bpy.ops.mesh.primitive_cube_add(size=${size}, location=(${location[0]}, ${location[1]}, ${location[2]}))
print("Cube created successfully")
        `;
      
      case 'create_sphere':
      case 'sphere':
        const sphereLocation = params.location || [0, 0, 0];
        const radius = params.radius || 1;
        return `
import bpy
bpy.ops.mesh.primitive_uv_sphere_add(radius=${radius}, location=(${sphereLocation[0]}, ${sphereLocation[1]}, ${sphereLocation[2]}))
print("Sphere created successfully")
        `;

      default:
        return `
import bpy
print(f"Command not implemented: ${command}")
        `;
    }
  }

  /**
   * Get available commands for a platform
   * 
   * @param platform The platform to get commands for
   * @returns List of available commands
   */
  getAvailableCommands(platform: SupportedPlatform) {
    // Basic set of commands for each platform
    if (platform === 'coreldraw') {
      return {
        operations: ['create', 'modify', 'delete', 'select', 'group', 'ungroup'],
        objectTypes: ['rectangle', 'circle', 'ellipse', 'polygon', 'text', 'line'],
      };
    } else if (platform === 'blender') {
      return {
        operations: ['create', 'modify', 'delete', 'select', 'transform'],
        objectTypes: ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'mesh'],
      };
    } else {
      return {
        operations: [],
        objectTypes: [],
      };
    }
  }
} 