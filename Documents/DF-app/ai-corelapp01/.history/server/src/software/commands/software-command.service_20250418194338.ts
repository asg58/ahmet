import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from '../coreldraw.service';
import { BlenderService } from '../blender.service';

export interface CommandResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface CommandOptions {
  timeout?: number;
  retryCount?: number;
  params?: Record<string, any>;
}

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
    platform: 'coreldraw' | 'blender',
    command: string,
    params: Record<string, any> = {}
  ) {
    this.logger.debug(`Executing command ${command} on ${platform} with params: ${JSON.stringify(params)}`);

    try {
      // Execute command on the appropriate platform
      if (platform === 'coreldraw') {
        return this.corelDrawService.executeCommand(command, params);
      } else if (platform === 'blender') {
        return this.blenderService.executeCommand(command, params);
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
   * Get available commands for a platform
   * 
   * @param platform The platform to get commands for
   * @returns List of available commands
   */
  getAvailableCommands(platform: 'coreldraw' | 'blender') {
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