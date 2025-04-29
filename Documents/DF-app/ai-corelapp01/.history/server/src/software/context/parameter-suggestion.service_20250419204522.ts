import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './design-context.interface';
import { DesignContextAnalyzerService } from './design-context-analyzer.service';
import { ChromaService } from '../../chroma/chroma.service';
import { SoftwareCommandService } from '../commands/software-command.service';

/**
 * Service that provides intelligent parameter suggestions for design actions
 * based on context analysis, historical usage, and document state.
 */
@Injectable()
export class ParameterSuggestionService {
  private readonly logger = new Logger(ParameterSuggestionService.name);

  constructor(
    private readonly designContextAnalyzer: DesignContextAnalyzerService,
    private readonly chromaService: ChromaService,
    private readonly softwareCommandService: SoftwareCommandService,
  ) {}

  /**
   * Suggests parameters for a specific action based on context, history, and document analysis
   * @param platform The software platform (CorelDRAW or Blender)
   * @param actionName The name of the action/command
   * @param currentContext The current design context
   * @param existingParams Any parameters already specified by the user
   * @returns An object with suggested parameter values
   */
  async suggestParameters(
    platform: string,
    actionName: string,
    currentContext: DesignContext,
    existingParams: Record<string, any> = {},
  ): Promise<Record<string, any>> {
    this.logger.log(`Suggesting parameters for ${actionName} on ${platform}`);
    
    try {
      // Get parameters from different sources and combine them intelligently
      const [historyParams, contextParams, docParams] = await Promise.all([
        this.getHistoricalParameters(platform, actionName),
        this.getContextBasedParameters(platform, actionName, currentContext),
        this.getDocumentAnalysisParameters(platform, actionName, currentContext),
      ]);

      // Combine all parameter sources, prioritizing:
      // 1. User-specified parameters (existingParams)
      // 2. Context-based parameters
      // 3. Document analysis parameters
      // 4. Historical parameters
      const combinedParams = {
        ...historyParams,
        ...docParams,
        ...contextParams,
        ...existingParams,
      };

      this.logger.debug(`Suggested parameters for ${actionName}: ${JSON.stringify(combinedParams)}`);
      return combinedParams;
    } catch (error) {
      this.logger.error(`Error suggesting parameters: ${error.message}`, error.stack);
      // Return existing params if there's an error
      return existingParams;
    }
  }

  /**
   * Retrieves commonly used parameters for this action from conversation history
   */
  private async getHistoricalParameters(
    platform: string,
    actionName: string,
  ): Promise<Record<string, any>> {
    try {
      // Query ChromaDB for similar commands used in the past
      const memories = await this.chromaService.queryConversationMemory(
        `${platform} ${actionName} parameters`,
        5,
      );

      // Extract and aggregate parameter values from similar past commands
      const historicalParams = {};
      
      for (const memory of memories) {
        try {
          if (memory.metadata?.parameters && memory.metadata.action === actionName) {
            Object.entries(memory.metadata.parameters).forEach(([key, value]) => {
              // Only add if not already present, prioritizing more recent commands
              if (!(key in historicalParams)) {
                historicalParams[key] = value;
              }
            });
          }
        } catch (error) {
          this.logger.warn(`Error processing memory metadata: ${error.message}`);
        }
      }

      return historicalParams;
    } catch (error) {
      this.logger.error(`Error retrieving historical parameters: ${error.message}`, error.stack);
      return {};
    }
  }

  /**
   * Determines intelligent parameter values based on current design context
   */
  private async getContextBasedParameters(
    platform: string,
    actionName: string,
    context: DesignContext,
  ): Promise<Record<string, any>> {
    try {
      // Analyze the current context to extract relevant parameters
      const contextParams = {};
      
      // Get parameter requirements for this action
      const actionInfo = await this.softwareCommandService.getActionParameters(platform, actionName);
      if (!actionInfo || !actionInfo.parameters) {
        return contextParams;
      }
      
      // Extract information from context based on parameter requirements
      for (const [paramName, paramInfo] of Object.entries(actionInfo.parameters)) {
        // Skip parameters that don't need context
        if (paramInfo.requiresContext === false) continue;
        
        // Add context-aware parameter suggestions
        switch (paramName) {
          case 'color':
            if (context.selectedObjects?.length > 0 && context.selectedObjects[0].fillColor) {
              contextParams[paramName] = context.selectedObjects[0].fillColor;
            } else if (context.dominantColors?.length > 0) {
              contextParams[paramName] = context.dominantColors[0];
            }
            break;
          
          case 'size':
          case 'width':
          case 'height':
            if (context.selectedObjects?.length > 0) {
              const obj = context.selectedObjects[0];
              if (paramName === 'size' && obj.size) {
                contextParams[paramName] = obj.size;
              } else if (paramName === 'width' && obj.width) {
                contextParams[paramName] = obj.width;
              } else if (paramName === 'height' && obj.height) {
                contextParams[paramName] = obj.height;
              }
            }
            break;
          
          case 'position':
          case 'x':
          case 'y':
          case 'z':
            if (context.selectedObjects?.length > 0) {
              const obj = context.selectedObjects[0];
              if (paramName === 'position' && obj.position) {
                contextParams[paramName] = obj.position;
              } else if (paramName === 'x' && obj.position?.x) {
                contextParams[paramName] = obj.position.x;
              } else if (paramName === 'y' && obj.position?.y) {
                contextParams[paramName] = obj.position.y;
              } else if (paramName === 'z' && obj.position?.z) {
                contextParams[paramName] = obj.position.z;
              }
            }
            break;
            
          // Add more parameter types as needed
        }
      }
      
      return contextParams;
    } catch (error) {
      this.logger.error(`Error determining context-based parameters: ${error.message}`, error.stack);
      return {};
    }
  }

  /**
   * Analyzes the document structure to suggest optimal parameters
   */
  private async getDocumentAnalysisParameters(
    platform: string,
    actionName: string,
    context: DesignContext,
  ): Promise<Record<string, any>> {
    try {
      // Perform deeper analysis on the document structure
      const analyzedContext = await this.designContextAnalyzer.analyzeVisualContext(context);
      const docParams = {};
      
      // Extract document-specific parameter suggestions
      if (analyzedContext) {
        // Example: Suggest alignment parameters based on object positioning
        if (actionName === 'alignObjects' && analyzedContext.objectGroups?.length > 0) {
          // Suggest alignment type (left, right, center) based on current arrangement
          docParams['alignmentType'] = analyzedContext.suggestedAlignment || 'center';
        }
        
        // Example: Suggest style parameters based on document theme
        if (actionName.includes('style') && analyzedContext.documentTheme) {
          docParams['style'] = analyzedContext.documentTheme;
        }
        
        // Add more document-specific parameter suggestions
      }
      
      return docParams;
    } catch (error) {
      this.logger.error(`Error analyzing document for parameters: ${error.message}`, error.stack);
      return {};
    }
  }
} 