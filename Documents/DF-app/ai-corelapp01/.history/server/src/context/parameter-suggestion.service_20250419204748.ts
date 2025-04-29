import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from '../software/context/design-context.interface';
import { ChromaService } from '../chroma/chroma.service';

export interface ParameterSuggestion {
  name: string;
  type: string;
  value: any;
  confidence: number;
  source: 'history' | 'context' | 'documentation' | 'default';
}

@Injectable()
export class ParameterSuggestionService {
  private readonly logger = new Logger(ParameterSuggestionService.name);

  constructor(private readonly chromaService: ChromaService) {}

  /**
   * Suggests parameters for a design action based on history, context, and documentation
   * @param platform The software platform (CorelDRAW or Blender)
   * @param action The action to be performed
   * @param context The current design context
   * @returns A record of suggested parameters with confidence scores
   */
  async suggestParameters(
    platform: string,
    action: string,
    context: DesignContext,
  ): Promise<Record<string, ParameterSuggestion>> {
    this.logger.log(`Suggesting parameters for ${action} on ${platform}`);

    try {
      // Get suggestions from different sources
      const historyParams = await this.getHistoricalParameters(platform, action);
      const contextParams = this.getContextBasedParameters(action, context);
      const docParams = await this.getDocumentationParameters(platform, action);

      // Combine all suggestions, with higher priority for context > history > documentation
      const combinedParams: Record<string, ParameterSuggestion> = {};

      // Add documentation parameters (lowest priority)
      Object.entries(docParams).forEach(([key, suggestion]) => {
        combinedParams[key] = suggestion;
      });

      // Add historical parameters (overrides documentation)
      Object.entries(historyParams).forEach(([key, suggestion]) => {
        combinedParams[key] = suggestion;
      });

      // Add context-derived parameters (highest priority)
      Object.entries(contextParams).forEach(([key, suggestion]) => {
        combinedParams[key] = suggestion;
      });

      this.logger.debug(
        `Suggested ${Object.keys(combinedParams).length} parameters for ${action}`,
      );
      return combinedParams;
    } catch (error) {
      this.logger.error(
        `Error suggesting parameters for ${action}: ${error.message}`,
        error.stack,
      );
      return {};
    }
  }

  /**
   * Retrieves parameters used historically for similar actions
   */
  private async getHistoricalParameters(
    platform: string,
    action: string,
  ): Promise<Record<string, ParameterSuggestion>> {
    try {
      // Query conversation memory for similar actions
      const memories = await this.chromaService.queryConversationMemory(
        `${platform} ${action} parameters`,
        5,
      );

      const suggestions: Record<string, ParameterSuggestion> = {};
      
      // Extract parameters from previous interactions
      memories.forEach(memory => {
        try {
          if (
            memory.metadata?.action === action &&
            memory.metadata?.platform === platform &&
            memory.metadata?.parameters
          ) {
            const params = memory.metadata.parameters;
            
            // Add each parameter to suggestions with confidence based on recency
            Object.entries(params).forEach(([key, value]) => {
              // Only add if not already present or if confidence is higher
              if (
                !suggestions[key] ||
                suggestions[key].confidence < memory.metadata.confidence || 0.5
              ) {
                suggestions[key] = {
                  name: key,
                  type: typeof value,
                  value: value,
                  confidence: memory.metadata.confidence || 0.5,
                  source: 'history',
                };
              }
            });
          }
        } catch (e) {
          this.logger.warn(`Error parsing memory: ${e.message}`);
        }
      });

      return suggestions;
    } catch (error) {
      this.logger.error(`Error getting historical parameters: ${error.message}`);
      return {};
    }
  }

  /**
   * Derives parameters from the current design context
   */
  private getContextBasedParameters(
    action: string,
    context: DesignContext,
  ): Record<string, ParameterSuggestion> {
    const suggestions: Record<string, ParameterSuggestion> = {};

    try {
      // Selected elements context
      if (context.selectedElements && context.selectedElements.length > 0) {
        suggestions['elementId'] = {
          name: 'elementId',
          type: 'string',
          value: context.selectedElements[0]?.id,
          confidence: 0.9,
          source: 'context',
        };

        if (context.selectedElements[0]?.type) {
          suggestions['elementType'] = {
            name: 'elementType',
            type: 'string',
            value: context.selectedElements[0]?.type,
            confidence: 0.9,
            source: 'context',
          };
        }
      }

      // Document properties context
      if (context.documentProperties) {
        const { width, height, units } = context.documentProperties;
        
        if (action.toLowerCase().includes('create') || action.toLowerCase().includes('resize')) {
          if (width) {
            suggestions['width'] = {
              name: 'width',
              type: 'number',
              value: width / 2, // Half the document width as a reasonable default
              confidence: 0.7,
              source: 'context',
            };
          }
          
          if (height) {
            suggestions['height'] = {
              name: 'height',
              type: 'number',
              value: height / 2, // Half the document height
              confidence: 0.7,
              source: 'context',
            };
          }
          
          if (units) {
            suggestions['units'] = {
              name: 'units',
              type: 'string',
              value: units,
              confidence: 0.8,
              source: 'context',
            };
          }
        }

        // Position suggestion in the center of the document
        if (action.toLowerCase().includes('create') || action.toLowerCase().includes('position')) {
          if (width && height) {
            suggestions['x'] = {
              name: 'x',
              type: 'number',
              value: width / 2,
              confidence: 0.6,
              source: 'context',
            };
            
            suggestions['y'] = {
              name: 'y',
              type: 'number',
              value: height / 2,
              confidence: 0.6,
              source: 'context',
            };
          }
        }
      }

      // Style context
      if (context.documentProperties?.theme) {
        const theme = context.documentProperties.theme;
        
        if (theme.colors && theme.colors.length > 0) {
          suggestions['color'] = {
            name: 'color',
            type: 'string',
            value: theme.colors[0],
            confidence: 0.7,
            source: 'context',
          };
        }
        
        if (theme.fonts && theme.fonts.length > 0) {
          suggestions['font'] = {
            name: 'font',
            type: 'string',
            value: theme.fonts[0],
            confidence: 0.7,
            source: 'context',
          };
        }
      }

      return suggestions;
    } catch (error) {
      this.logger.error(`Error getting context-based parameters: ${error.message}`);
      return {};
    }
  }

  /**
   * Retrieves parameters from API documentation
   */
  private async getDocumentationParameters(
    platform: string,
    action: string,
  ): Promise<Record<string, ParameterSuggestion>> {
    try {
      // Query API documentation for action parameters
      const apiDocs = await this.chromaService.queryApiDocumentation(
        `${platform} ${action} parameters`,
        3,
      );

      const suggestions: Record<string, ParameterSuggestion> = {};
      
      // Extract parameter information from documentation
      apiDocs.forEach(doc => {
        try {
          if (doc.metadata?.parameters) {
            const params = doc.metadata.parameters;
            
            // Add each documented parameter to suggestions
            Object.entries(params).forEach(([key, paramInfo]: [string, any]) => {
              if (
                !suggestions[key] || 
                suggestions[key].confidence < 0.4
              ) {
                suggestions[key] = {
                  name: key,
                  type: paramInfo.type || 'any',
                  value: paramInfo.default !== undefined ? paramInfo.default : null,
                  confidence: 0.4,
                  source: 'documentation',
                };
              }
            });
          }
        } catch (e) {
          this.logger.warn(`Error parsing API documentation: ${e.message}`);
        }
      });

      return suggestions;
    } catch (error) {
      this.logger.error(`Error getting documentation parameters: ${error.message}`);
      return {};
    }
  }
} 