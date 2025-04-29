import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { CorelContextAnalyzer } from './context/corel-context';
import { BlenderContextAnalyzer } from './context/blender-context';
import { CommandFactoryService } from './commands/command-factory.service';
import { ObjectModelCommandAdapter } from './universal/object-model-command-adapter';
import { DesignContext } from './context/design-context';
import { ContextAwareQueryService } from './context/context-aware-query.service';

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
    private readonly contextAwareQueryService: ContextAwareQueryService
  ) {}

  /**
   * Get available and connected software platforms
   */
  async getAvailablePlatforms(): Promise<{ coreldraw: boolean; blender: boolean }> {
    const corelAvailable = await this.corelDrawService
      .getStatus()
      .then(status => status.connected)
      .catch(() => false);
    
    const blenderAvailable = await this.blenderService
      .getStatus()
      .then(status => status.connected)
      .catch(() => false);
    
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
  ): Promise<any> {
    this.logger.debug(`Executing command on platform ${platform}: ${command}`);
    
    if (platform === 'coreldraw') {
      return this.corelDrawService.executeCommand(command, options);
    } else if (platform === 'blender') {
      return this.blenderService.executeCommand(command, options);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
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
        context = await this.corelContextAnalyzer.captureContext();
      } else if (platform === 'blender') {
        context = await this.blenderContextAnalyzer.captureContext();
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Add action history to context
      context.actionHistory = this.actionHistory[platform];
      
      // Calculate statistics
      context.statistics = this.contextAwareQueryService.calculateDocumentStats(context);
      
      return context;
    } catch (error) {
      this.logger.error(`Error getting design context: ${error.message}`);
      throw error;
    }
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
      
      // First attempt to execute via the UniversalObjectModel adapter
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
        result = await this.blenderService.executeCommand(code);
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
    
    // Use the appropriate model for code generation
    const response = await this.ollamaService.chatCompletion({
      model: 'codeqwen:14b-q4_K_M', // CodeQwen 14B for code generation
      messages: codeGenPrompt,
      temperature: 0.2, // Lower temperature for more predictable/factual responses
    });
    
    // Extract the code from the response
    const content = response.choices[0].message.content;
    
    // Try to find code blocks, otherwise return the whole content
    const codeBlockMatch = content.match(/```(?:[a-z]+)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    return content.trim();
  }
} 