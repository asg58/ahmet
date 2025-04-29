import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { OllamaService, ChatMessage, TaskType } from '../ollama/ollama.service';
import { CorelContextAnalyzer } from './context/corel-context';
import { BlenderContextAnalyzer } from './context/blender-context';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { ContextAwareCommandAdapter } from './context/context-aware-command-adapter';
import { DesignContext } from './context/design-context';
import { ContextAwareQueryService } from './context/context-aware-query.service';
import { CommandResult } from './commands/command.types';
import { CorelDrawContextAnalyzer } from './context/coreldraw-context-analyzer';
import { CodeValidationService } from './code-validation.service';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  visualData?: {
    type: 'image' | '3d' | 'svg';
    data: string;
  };
  returnValue?: any;
}

/**
 * Main service for software integration
 */
@Injectable()
export class SoftwareService {
  private readonly logger = new Logger(SoftwareService.name);
  private actionHistory: Record<string, DesignContext['actionHistory']> = {
    coreldraw: [],
    blender: []
  };

  constructor(
    private readonly corelDrawService: CorelDrawService,
    private readonly blenderService: BlenderService,
    private readonly ollamaService: OllamaService,
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
    private readonly commandFactory: CommandFactoryService,
    private readonly objectModelAdapter: ObjectModelCommandAdapter,
    private readonly contextAwareAdapter: ContextAwareCommandAdapter,
    private readonly contextAwareQueryService: ContextAwareQueryService,
    private readonly corelDrawContextAnalyzer: CorelDrawContextAnalyzer,
    private readonly codeValidationService: CodeValidationService
  ) {}

  /**
   * Get available and connected software platforms
   */
  async getAvailablePlatforms(): Promise<{ coreldraw: boolean; blender: boolean }> {
    let corelAvailable = false;
    let blenderAvailable = false;
    
    try {
      corelAvailable = await this.corelDrawService
        .getStatus()
        .then(status => status.connected)
        .catch(() => false);
    } catch (error) {
      this.logger.warn(`Failed to get CorelDraw status: ${error.message}`);
      // Default to false if there's an error
    }
    
    try {
      blenderAvailable = await this.blenderService
        .getStatus()
        .then(status => status.connected)
        .catch(() => false);
    } catch (error) {
      this.logger.warn(`Failed to get Blender status: ${error.message}`);
      // Default to false if there's an error
    }
    
    return {
      coreldraw: corelAvailable,
      blender: blenderAvailable
    };
  }

  /**
   * Execute command on specified platform
   */
  async executeCommand(
    platform: 'coreldraw' | 'blender',
    command: string,
    options: any = {}
  ): Promise<CommandResult> {
    this.logger.debug(`Executing command on platform ${platform}: ${command}`);
    
    try {
      if (platform === 'coreldraw') {
        try {
          return await this.corelDrawService.executeCommand(command, options);
        } catch (error) {
          this.logger.error(`Error executing command on CorelDraw: ${error.message}`);
          return {
            success: false,
            output: `Failed to execute command on CorelDraw: ${error.message}`,
            error: error.message,
            data: null
          };
        }
      } else if (platform === 'blender') {
        try {
          // Use executeCode for Blender since it doesn't have executeCommand
          return await this.blenderService.executeCode(command);
        } catch (error) {
          this.logger.error(`Error executing command on Blender: ${error.message}`);
          return {
            success: false,
            output: `Failed to execute command on Blender: ${error.message}`,
            error: error.message,
            data: null
          };
        }
      } else {
        this.logger.error(`Unsupported platform: ${platform}`);
        return {
          success: false,
          output: `Unsupported platform: ${platform}`,
          error: `Unsupported platform: ${platform}`,
          data: null
        };
      }
    } catch (error) {
      this.logger.error(`Unexpected error executing command: ${error.message}`);
      return {
        success: false,
        output: `Unexpected error: ${error.message}`,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get current design context from specified platform
   */
  async getDesignContext(platform: 'coreldraw' | 'blender'): Promise<DesignContext> {
    this.logger.debug(`Getting design context for platform ${platform}`);
    
    try {
      let context: DesignContext;
      
      if (platform === 'coreldraw') {
        try {
          context = await this.corelContextAnalyzer.captureContext();
        } catch (error) {
          this.logger.error(`Error capturing CorelDRAW context: ${error.message}`);
          context = this.createMockContext(platform);
        }
      } else if (platform === 'blender') {
        try {
          context = await this.blenderContextAnalyzer.captureContext();
        } catch (error) {
          this.logger.error(`Error capturing Blender context: ${error.message}`);
          context = this.createMockContext(platform);
        }
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Add action history to context
      context.actionHistory = this.actionHistory[platform] || [];
      
      // Calculate statistics (safely)
      try {
        context.statistics = this.contextAwareQueryService.calculateDocumentStats(context);
      } catch (error) {
        this.logger.error(`Error calculating context statistics: ${error.message}`);
        context.statistics = {
          documentComplexity: 'simple',
          totalElements: 0,
          elementsByType: {}
        };
      }
      
      return context;
    } catch (error) {
      this.logger.error(`Error getting design context: ${error.message}`);
      // Return a mock context instead of throwing
      return this.createMockContext(platform);
    }
  }

  /**
   * Create a mock design context when the actual context cannot be retrieved
   */
  private createMockContext(platform: 'coreldraw' | 'blender'): DesignContext {
    return {
      platform: platform,
      documentId: 'unavailable',
      documentName: 'Unavailable',
      documentPath: 'Unavailable',
      size: {
        width: 800,
        height: 600,
        depth: 0
      },
      layers: [],
      selectedElements: [],
      actionHistory: this.actionHistory[platform] || [],
      viewTransform: {
        zoom: 1,
        panX: 0,
        panY: 0
      },
      statistics: {
        documentComplexity: 'simple',
        totalElements: 0,
        elementsByType: {}
      }
    };
  }

  /**
   * Execute action on specified platform
   */
  async executeAction(
    platform: 'coreldraw' | 'blender',
    action: string,
    parameters: Record<string, any>,
    context: ChatMessage[],
  ): Promise<ExecutionResult> {
    this.logger.debug(`Executing action on ${platform}: ${action}`);
    
    try {
      // First get the current design context
      const designContext = await this.getDesignContext(platform);
      
      // First attempt to execute via the ContextAwareCommandAdapter
      try {
        this.logger.debug(`Attempting to execute via ContextAwareCommandAdapter`);
        const contextAwareResult = await this.contextAwareAdapter.executeContextAwareCommand(
          platform, 
          action, 
          parameters
        );
        
        // If successful, record in action history
        if (contextAwareResult.success) {
          this.logger.debug(`Action executed successfully via ContextAwareCommandAdapter`);
          this.recordAction(platform, {
            type: action,
            description: `Executed ${action} via context-aware adapter`,
            parameters,
            timestamp: Date.now(),
            success: true
          });
          
          return {
            success: contextAwareResult.success,
            output: contextAwareResult.output,
            error: contextAwareResult.error,
            visualData: contextAwareResult.visualData,
            returnValue: contextAwareResult.data
          };
        }
      } catch (error) {
        this.logger.debug(`ContextAwareCommandAdapter execution failed: ${error.message}`);
        // Continue to next approach if context-aware execution fails
      }
      
      // Then attempt to execute via the standard ObjectModelAdapter
      try {
        this.logger.debug(`Attempting to execute via UniversalObjectModel`);
        const objectModelResult = await this.objectModelAdapter.executeCommandViaObjectModel(
          platform, 
          action, 
          parameters
        );
        
        // If successful, record in action history
        if (objectModelResult.success) {
          this.logger.debug(`Action executed successfully via UniversalObjectModel`);
          this.recordAction(platform, {
            type: action,
            description: `Executed ${action} via object model`,
            parameters,
            timestamp: Date.now(),
            success: true
          });
          
          return {
            success: objectModelResult.success,
            output: objectModelResult.output,
            error: objectModelResult.error,
            visualData: objectModelResult.visualData,
            returnValue: objectModelResult.data
          };
        }
      } catch (error) {
        this.logger.debug(`UniversalObjectModel execution failed: ${error.message}`);
        // Continue to next approach if object model fails
      }
      
      // Then attempt to execute the action using the command factory
      const commandResult = await this.commandFactory.executeCommand(platform, action, parameters);
      
      // If successful or if it's a recognized command with an error, return the result
      if (commandResult.success || (commandResult.error && !commandResult.error.includes('Unknown'))) {
        this.recordAction(platform, {
          type: action,
          description: `Executed ${action} via command factory`,
          parameters,
          timestamp: Date.now(),
          success: commandResult.success
        });
        
        return {
          success: commandResult.success,
          output: commandResult.output,
          error: commandResult.error,
          visualData: commandResult.visualData,
          returnValue: commandResult.data
        };
      }
      
      // If the command is not recognized, fall back to code generation
      this.logger.debug(`Command ${action} not recognized, falling back to code generation`);
      
      // Build a context-aware prompt using the current design context
      const enrichedContext = this.buildContextAwarePrompt(context, designContext);
      
      // Generate code for the requested platform
      const code = await this.generateCode(platform, action, parameters, enrichedContext);
      
      // Execute the code on the appropriate platform
      let result: ExecutionResult;
      if (platform === 'coreldraw') {
        result = await this.corelDrawService.executeCommand(code);
      } else if (platform === 'blender') {
        result = await this.blenderService.executeCode(code);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Record the action in history
      this.recordAction(platform, {
        type: action,
        description: `Generated and executed code for ${action}`,
        parameters,
        timestamp: Date.now(),
        success: result.success
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Action execution error: ${error.message}`);
      
      // Record the failed action
      this.recordAction(platform, {
        type: action,
        description: `Failed to execute ${action}`,
        parameters,
        timestamp: Date.now(),
        success: false
      });
      
      return {
        success: false,
        error: `Failed to execute action: ${error.message}`,
      };
    }
  }

  /**
   * Record an action in the history
   */
  private recordAction(
    platform: 'coreldraw' | 'blender',
    action: DesignContext['actionHistory'][0]
  ): void {
    // Initialize history array if not exist
    if (!this.actionHistory[platform]) {
      this.actionHistory[platform] = [];
    }
    
    // Add action to history
    this.actionHistory[platform].push(action);
    
    // Limit history size to 20 items
    if (this.actionHistory[platform].length > 20) {
      this.actionHistory[platform] = this.actionHistory[platform].slice(-20);
    }
  }

  /**
   * Build a context-aware prompt for AI
   */
  private buildContextAwarePrompt(
    context: ChatMessage[],
    designContext: DesignContext
  ): ChatMessage[] {
    const basePrompt = 
      designContext.platform === 'coreldraw'
        ? 'You are an expert in CorelDRAW automation using VBA/COM. Generate useful code based on instructions and parameters.'
        : 'You are an expert in Blender automation using Python. Generate useful code based on instructions and parameters.';
    
    return this.contextAwareQueryService.buildPromptWithContext(
      basePrompt,
      designContext,
      context
    );
  }

  /**
   * Generate code for executing an action
   */
  private async generateCode(
    platform: 'coreldraw' | 'blender',
    action: string,
    parameters: Record<string, any>,
    context: ChatMessage[],
  ): Promise<string> {
    // Add the specific code generation request
    const codeGenPrompt: ChatMessage[] = [...context];
    
    // Add the user request for code generation
    codeGenPrompt.push({
      role: 'user',
      content: `Genereer code voor de volgende actie: ${action}
Parameters: ${JSON.stringify(parameters, null, 2)}

De code moet alleen de benodigde functionaliteit bevatten, zonder extra uitleg of commentaar.
${platform === 'coreldraw' 
  ? 'Genereer VBA-code die COM-automatisering gebruikt om CorelDRAW aan te sturen.'
  : 'Genereer Python code voor Blender die bpy (Blender Python API) gebruikt.'}`,
    });
    
    // Use the task-specific model for code generation
    const response = await this.ollamaService.chatCompletionForTask(
      codeGenPrompt,
      TaskType.CODE_GENERATION,
      { temperature: 0.2 } // Lower temperature for more predictable/factual responses
    );
    
    // Extract the code from the response
    const content = response.choices[0].message.content;
    
    // Try to find code blocks, otherwise return the whole content
    const codeBlockMatch = content.match(/```(?:[a-z]+)?\n([\s\S]*?)```/);
    let initialCode = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim();
    
    // Use progressive code construction with validation feedback
    const { code: improvedCode } = await this.codeValidationService.buildCodeProgressively(
      initialCode,
      platform,
      action,
      3 // Maximum 3 iterations
    );
    
    return improvedCode;
  }

  /**
   * Get textual description of current design context
   */
  async getDesignContextDescription(platform: string): Promise<string> {
    let analyzer;
    
    switch (platform.toLowerCase()) {
      case 'coreldraw':
        analyzer = this.corelDrawContextAnalyzer;
        break;
      case 'blender':
        analyzer = this.blenderContextAnalyzer;
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    const context = await analyzer.captureContext();
    return analyzer.convertContextToText(context);
  }

  /**
   * Enhance a query with context information
   */
  async enhanceQueryWithContext(platform: string, query: string): Promise<string> {
    let analyzer;
    
    switch (platform.toLowerCase()) {
      case 'coreldraw':
        analyzer = this.corelDrawContextAnalyzer;
        break;
      case 'blender':
        analyzer = this.blenderContextAnalyzer;
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    const context = await analyzer.captureContext();
    return `${query}\n\nCurrent design context: ${analyzer.convertContextToText(context)}`;
  }

  /**
   * Get available commands for a platform
   */
  getAvailableCommands(platform: string): string[] {
    return this.commandFactory.getAvailableCommands(platform as 'coreldraw' | 'blender');
  }

  /**
   * Execute code directly on a platform
   */
  async executeCode(platform: string, code: string): Promise<any> {
    switch (platform.toLowerCase()) {
      case 'coreldraw':
        return this.corelDrawService.executeVbaCode(code);
      case 'blender':
        return this.blenderService.executeCode(code);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Switch design platform while preserving context where possible
   */
  async switchPlatform(fromPlatform: string, toPlatform: string): Promise<CommandResult> {
    this.logger.log(`Switching platform from ${fromPlatform} to ${toPlatform}`);
    
    // Get context from current platform
    let sourceContext;
    try {
      if (fromPlatform === 'coreldraw') {
        sourceContext = await this.corelDrawContextAnalyzer.captureContext();
      } else if (fromPlatform === 'blender') {
        sourceContext = await this.blenderContextAnalyzer.captureContext();
      } else {
        throw new Error(`Unsupported source platform: ${fromPlatform}`);
      }
      
      this.logger.debug(`Captured source context with ${sourceContext.elements.length} elements`);
    } catch (error) {
      this.logger.error(`Failed to capture source context: ${error.message}`);
      return {
        success: false,
        data: null,
        error: `Failed to capture source context: ${error.message}`
      };
    }
    
    // Create equivalent design in target platform
    try {
      if (toPlatform === 'coreldraw') {
        // TODO: Implement conversion from Blender to CorelDRAW context
        return {
          success: true,
          data: 'Switched to CorelDRAW',
          error: null
        };
      } else if (toPlatform === 'blender') {
        // TODO: Implement conversion from CorelDRAW to Blender context
        return {
          success: true,
          data: 'Switched to Blender',
          error: null
        };
      } else {
        throw new Error(`Unsupported target platform: ${toPlatform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to switch platform: ${error.message}`);
      return {
        success: false,
        data: null,
        error: `Failed to switch platform: ${error.message}`
      };
    }
  }

  /**
   * Check if a software is running
   */
  async isSoftwareRunning(platform: string): Promise<boolean> {
    switch (platform.toLowerCase()) {
      case 'coreldraw':
        return this.corelDrawService.isRunning();
      case 'blender':
        return this.blenderService.getStatus().then(status => status.connected);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Perform cross-platform validation of code
   * Checks if code written for one platform can be conceptually mapped to the other
   */
  async validateCrossPlatform(
    code: string,
    sourcePlatform: 'coreldraw' | 'blender'
  ): Promise<any> {
    this.logger.log(`Validating ${sourcePlatform} code for cross-platform compatibility`);
    return this.codeValidationService.validateCrossPlatform(code, sourcePlatform);
  }

  /**
   * Validate code for a specific platform
   */
  async validateCode(
    code: string,
    platform: 'coreldraw' | 'blender',
    action: string
  ): Promise<any> {
    this.logger.log(`Validating ${platform} code for action: ${action}`);
    return this.codeValidationService.validateCode(code, platform, action);
  }
} 