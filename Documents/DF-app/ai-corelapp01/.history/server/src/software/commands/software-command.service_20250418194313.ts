import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from '../coreldraw.service';
import { BlenderService } from '../blender.service';
import { CodeExecutorFactory } from '../universal/code-executor';
import { DesignConceptMapper } from '../universal/design-concepts';

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
    private readonly codeExecutorFactory: CodeExecutorFactory,
    private readonly designConceptMapper: DesignConceptMapper,
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
      // Get the appropriate code executor
      const executor = this.codeExecutorFactory.getExecutor(platform);

      // Check if platform is available
      const isAvailable = await executor.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: `Platform ${platform} is not available`,
        };
      }

      // Try to map the command to platform-specific code
      let code: string;
      try {
        code = this.designConceptMapper.generateCode(command, platform, params);
      } catch (error) {
        this.logger.warn(`Failed to map command using design concepts: ${error.message}`);
        
        // Fall back to direct command execution if we couldn't map it
        if (platform === 'coreldraw') {
          return this.corelDrawService.executeCommand(command, params);
        } else if (platform === 'blender') {
          return this.blenderService.executeCommand(command, params);
        }
        
        return {
          success: false,
          error: `Failed to execute command: ${error.message}`,
        };
      }

      // Execute the generated code
      return executor.executeCode(code);
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
    const operations = this.designConceptMapper.getAvailableOperations(platform);
    const objectTypes = this.designConceptMapper.getAvailableObjectTypes(platform);
    
    return {
      operations,
      objectTypes,
    };
  }
} 