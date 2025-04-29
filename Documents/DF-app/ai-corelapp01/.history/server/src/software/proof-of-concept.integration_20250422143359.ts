import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { ContextAwareCommandAdapter } from './context/context-aware-command-adapter';
import { DesignContextAnalyzerService } from './context/design-context-analyzer.service';
import { EnhancedContextQueryService } from './context/enhanced-context-query.service';
import { OllamaService, TaskType } from '../ollama/ollama.service';
import { CommandResult } from './commands/command-result.interface';
import { PlatformSwitchingService } from './platform-switching.service';
import { ParameterSuggestionService } from './context/parameter-suggestion.service';
import { DesignContext } from './context/design-context.interface';

/**
 * Proof of Concept Integration Service
 * 
 * This service provides end-to-end testing of the context-aware command execution
 * in both CorelDRAW and Blender, demonstrating the full pipeline from natural
 * language to executed commands with visual context awareness.
 */
@Injectable()
export class ProofOfConceptIntegration implements OnModuleInit {
  private readonly logger = new Logger(ProofOfConceptIntegration.name);
  private readonly testCases = {
    coreldraw: [
      "Create a red circle in the center",
      "Add a blue rectangle next to it",
      "Create a text box with the text 'CorelDRAW Demo'"
    ],
    blender: [
      "Create a cube in the center",
      "Add a sphere next to it",
      "Create a text object that says 'Blender Demo'"
    ]
  };
  
  constructor(
    private readonly softwareService: SoftwareService,
    private readonly contextAwareAdapter: ContextAwareCommandAdapter,
    private readonly contextAnalyzer: DesignContextAnalyzerService,
    private readonly enhancedQueryService: EnhancedContextQueryService,
    private readonly ollamaService: OllamaService,
    private readonly platformSwitchingService: PlatformSwitchingService,
    private readonly parameterSuggestionService: ParameterSuggestionService
  ) {}
  
  /**
   * Initialize the PoC service and optionally run tests
   */
  async onModuleInit() {
    this.logger.log('Proof of Concept Integration service initialized');
  }
  
  /**
   * Run all test cases for a specific platform
   */
  async runPlatformTests(platform: 'coreldraw' | 'blender'): Promise<TestResult[]> {
    this.logger.log(`Running PoC tests for ${platform}`);
    
    // Start context analysis
    await this.contextAnalyzer.startAnalyzing(platform);
    
    // Wait for initial context capture
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results: TestResult[] = [];
    
    // Run each test case
    for (const naturalLanguageQuery of this.testCases[platform]) {
      try {
        const result = await this.processNaturalLanguageCommand(platform, naturalLanguageQuery);
        results.push({
          platform,
          query: naturalLanguageQuery,
          success: result.success,
          error: result.error,
          commandExecuted: result.commandExecuted,
          parameters: result.parameters
        });
        
        // Wait a bit between commands to allow context to update
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          platform,
          query: naturalLanguageQuery,
          success: false,
          error: error.message
        });
      }
    }
    
    // Stop context analysis
    await this.contextAnalyzer.stopAnalyzing();
    
    return results;
  }
  
  /**
   * Execute a single test with natural language
   */
  async testNaturalLanguageCommand(
    platform: 'coreldraw' | 'blender', 
    query: string
  ): Promise<TestResult> {
    this.logger.log(`Testing natural language command: "${query}" on ${platform}`);
    
    try {
      // Start context analysis if not already running
      await this.contextAnalyzer.startAnalyzing(platform);
      
      // Process the command
      const result = await this.processNaturalLanguageCommand(platform, query);
      
      return {
        platform,
        query,
        success: result.success,
        error: result.error,
        commandExecuted: result.commandExecuted,
        parameters: result.parameters
      };
    } catch (error) {
      this.logger.error(`Error executing test: ${error.message}`);
      
      return {
        platform,
        query,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process natural language command and execute in context-aware mode
   */
  async processNaturalLanguageCommand(platform: 'coreldraw' | 'blender', query: string): Promise<CommandResult> {
    this.logger.log(`Processing natural language command for ${platform}: "${query}"`);
    
    // Use current platform if not explicitly specified
    if (platform === 'auto') {
      const currentPlatform = this.platformSwitchingService.getCurrentPlatform();
      if (!currentPlatform) {
        throw new Error('No active platform detected. Please specify a platform explicitly.');
      }
      platform = currentPlatform;
      this.logger.log(`Using current active platform: ${platform}`);
    }
    
    try {
      // Analyze the current design context
      const designContext = await this.contextAnalyzer.analyzeCurrentDesignContext(platform);
      
      // Extract intent and action using enhanced context
      const { intent, action } = await this.extractIntentAndAction(query, designContext);
      
      // Use parameter suggestion service to get intelligent parameter suggestions
      const suggestedParameters = await this.parameterSuggestionService.suggestParameters(
        platform,
        action,
        designContext
      );
      
      // Execute with context-aware adapter
      const result = await this.contextAwareAdapter.executeWithContext({
        platform,
        action,
        parameters: suggestedParameters,
        context: designContext,
        originalQuery: query
      });
      
      // Record successful command for future parameter suggestions
      if (result.success) {
        this.parameterSuggestionService.recordCommand(platform, action, result.parameters, designContext);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error processing natural language command: ${error.message}`, error.stack);
      return {
        success: false,
        error: `Failed to process command: ${error.message}`
      };
    }
  }
  
  /**
   * Extract intent and action from natural language using visual context
   */
  private async extractIntentAndAction(
    query: string,
    platform: 'coreldraw' | 'blender',
    context: any
  ): Promise<{
    action?: string;
    parameters?: Record<string, any>;
  }> {
    // Create prompt for code generation
    const basePrompt = `You are an expert in ${platform === 'coreldraw' ? 'vector graphics' : '3D modeling'} 
    that translates natural language instructions into precise software commands. 
    Convert the user's request into a command and parameters for ${platform}.
    
    Return your answer in this exact JSON format:
    {
      "action": "action_name",
      "parameters": {
        "param1": "value1",
        "param2": "value2"
      }
    }
    
    Use only commands that are valid for ${platform}.
    Common ${platform} commands include: ${this.getCommonCommands(platform)}.`;
    
    // Enhance prompt with visual context
    const promptMessages = await this.enhancedQueryService.enhancePromptWithFullContext(
      basePrompt,
      platform,
      [{ role: 'user', content: query }]
    );
    
    // Generate code using appropriate model
    const response = await this.ollamaService.chatCompletionForTask(
      promptMessages,
      TaskType.CODE_GENERATION,
      { temperature: 0.2 }
    );
    
    const content = response.choices[0].message.content;
    
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        return {
          action: parsedJson.action,
          parameters: parsedJson.parameters || {}
        };
      }
      
      throw new Error('Could not extract valid JSON from response');
    } catch (error) {
      this.logger.error(`Error parsing intent JSON: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Get common commands for a platform
   */
  private getCommonCommands(platform: 'coreldraw' | 'blender'): string {
    if (platform === 'coreldraw') {
      return 'create_rectangle, create_ellipse, create_text, set_fill_color, select_object';
    } else {
      return 'create_cube, create_sphere, create_text, set_material, select_object';
    }
  }
}

/**
 * Test result interface
 */
export interface TestResult {
  platform: 'coreldraw' | 'blender';
  query: string;
  success: boolean;
  error?: string;
  commandExecuted?: string;
  parameters?: Record<string, any>;
} 