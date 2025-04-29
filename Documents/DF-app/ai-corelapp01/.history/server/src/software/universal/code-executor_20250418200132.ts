/**
 * Code Executor Interface
 * 
 * Defines a common interface for executing code across different design software platforms.
 */

import { Injectable } from '@nestjs/common';
import { CorelDrawService } from '../coreldraw.service';
import { BlenderService } from '../blender.service';

/**
 * Response from code execution
 */
export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  visualResult?: {
    type: 'svg' | 'image' | '3d';
    data: string;
  };
  returnData?: any;
}

/**
 * Options for code execution
 */
export interface CodeExecutionOptions {
  timeout?: number;
  includeVisualization?: boolean;
  language?: string;
  executeAsync?: boolean;
  captureOutput?: boolean;
}

/**
 * Generic interface for code executors
 */
export interface CodeExecutor {
  /**
   * Execute code on the target platform
   * 
   * @param code The code to execute
   * @param options Execution options
   * @returns Execution result
   */
  executeCode(code: string, options?: CodeExecutionOptions): Promise<CodeExecutionResult>;
  
  /**
   * Check if the platform is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get the supported languages for this executor
   */
  getSupportedLanguages(): string[];
}

/**
 * CorelDRAW code executor implementation
 */
@Injectable()
export class CorelDrawCodeExecutor implements CodeExecutor {
  constructor(private readonly corelService: CorelDrawService) {}
  
  async executeCode(code: string, options: CodeExecutionOptions = {}): Promise<CodeExecutionResult> {
    try {
      // By default, we execute VBA code
      const language = options.language || 'vba';
      
      if (language === 'vba') {
        const result = await this.corelService.executeVbaCode(code, {
          timeout: options.timeout,
          captureOutput: options.captureOutput !== false,
        });
        
        return {
          success: result.success,
          output: result.output,
          error: result.error,
          returnData: result.data,
        };
      } else {
        return {
          success: false,
          error: `Unsupported language: ${language}. CorelDRAW only supports VBA.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Execution error: ${error.message}`,
      };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.corelService.getStatus();
      return status.connected;
    } catch (error) {
      return false;
    }
  }
  
  getSupportedLanguages(): string[] {
    return ['vba'];
  }
}

/**
 * Blender code executor implementation
 */
@Injectable()
export class BlenderCodeExecutor implements CodeExecutor {
  constructor(private readonly blenderService: BlenderService) {}
  
  async executeCode(code: string, options: CodeExecutionOptions = {}): Promise<CodeExecutionResult> {
    try {
      // By default, we execute Python code
      const language = options.language || 'python';
      
      if (language === 'python') {
        const result = await this.blenderService.executePythonCode(code, {
          timeout: options.timeout,
          captureOutput: options.captureOutput !== false,
          includeVisualization: options.includeVisualization,
          executeAsync: options.executeAsync,
        });
        
        return {
          success: result.success,
          output: result.output,
          error: result.error,
          visualResult: result.visualResult,
          returnData: result.data,
        };
      } else {
        return {
          success: false,
          error: `Unsupported language: ${language}. Blender only supports Python.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Execution error: ${error.message}`,
      };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.blenderService.getStatus();
      return status.connected;
    } catch (error) {
      return false;
    }
  }
  
  getSupportedLanguages(): string[] {
    return ['python'];
  }
}

/**
 * Factory service for getting the appropriate executor for a platform
 */
@Injectable()
export class CodeExecutorFactory {
  constructor(
    private readonly corelDrawExecutor: CorelDrawCodeExecutor,
    private readonly blenderExecutor: BlenderCodeExecutor,
  ) {}
  
  getExecutor(platform: 'coreldraw' | 'blender'): CodeExecutor {
    switch (platform) {
      case 'coreldraw':
        return this.corelDrawExecutor;
      case 'blender':
        return this.blenderExecutor;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  
  async getAvailablePlatforms(): Promise<('coreldraw' | 'blender')[]> {
    const platforms: ('coreldraw' | 'blender')[] = [];
    
    if (await this.corelDrawExecutor.isAvailable()) {
      platforms.push('coreldraw');
    }
    
    if (await this.blenderExecutor.isAvailable()) {
      platforms.push('blender');
    }
    
    return platforms;
  }
} 