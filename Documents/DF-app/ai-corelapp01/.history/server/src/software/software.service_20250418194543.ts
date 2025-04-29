import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from './coreldraw.service';
import { BlenderService } from './blender.service';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { CorelContextAnalyzer } from './context/corel-context';
import { BlenderContextAnalyzer } from './context/blender-context';

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

  constructor(
    private readonly corelDrawService: CorelDrawService,
    private readonly blenderService: BlenderService,
    private readonly ollamaService: OllamaService,
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer
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
      return this.corelDrawService.executeCode(command, options);
    } else if (platform === 'blender') {
      return this.blenderService.executeCode(command, options);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get current design context from specified platform
   */
  async getDesignContext(platform: 'coreldraw' | 'blender'): Promise<any> {
    this.logger.debug(`Getting design context for platform ${platform}`);
    
    if (platform === 'coreldraw') {
      return this.corelContextAnalyzer.captureContext();
    } else if (platform === 'blender') {
      return this.blenderContextAnalyzer.captureContext();
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async executeAction(
    platform: 'coreldraw' | 'blender',
    action: string,
    parameters: Record<string, any>,
    context: ChatMessage[],
  ): Promise<ExecutionResult> {
    this.logger.debug(`Executing action on ${platform}: ${action}`);
    
    try {
      // Generate code for the requested platform
      const code = await this.generateCode(platform, action, parameters, context);
      
      // Execute the code on the appropriate platform
      if (platform === 'coreldraw') {
        return await this.corelDrawService.executeCode(code);
      } else if (platform === 'blender') {
        return await this.blenderService.executeCode(code);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Action execution error: ${error.message}`);
      return {
        success: false,
        error: `Failed to execute action: ${error.message}`,
      };
    }
  }

  private async generateCode(
    platform: 'coreldraw' | 'blender',
    action: string,
    parameters: Record<string, any>,
    context: ChatMessage[],
  ): Promise<string> {
    // Create a prompt to generate code
    const codeGenPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: platform === 'coreldraw'
          ? `Je bent een expert in het genereren van code voor CorelDRAW automatisering via VBA/COM. Genereer bruikbare code op basis van de instructies en parameters.`
          : `Je bent een expert in het genereren van Blender Python code. Genereer bruikbare code op basis van de instructies en parameters.`,
      },
    ];
    
    // Add relevant context from the conversation
    codeGenPrompt.push(...context.slice(-3));
    
    // Formulate the code generation request
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