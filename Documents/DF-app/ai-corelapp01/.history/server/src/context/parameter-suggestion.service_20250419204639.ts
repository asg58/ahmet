import { Injectable, Logger } from '@nestjs/common';
import { DesignContext, DesignElement } from '../software/context/design-context';
import { ChromaService } from '../chroma/chroma.service';

interface ParameterSuggestion {
  name: string;
  value: any;
  confidence: number;
  source: 'history' | 'context' | 'documentation' | 'default';
  explanation: string;
}

@Injectable()
export class ParameterSuggestionService {
  private readonly logger = new Logger(ParameterSuggestionService.name);

  constructor(private readonly chromaService: ChromaService) {}

  /**
   * Suggests parameters for a design action based on various sources
   * @param action The action to suggest parameters for
   * @param context The current design context
   * @param platform The software platform (corel or blender)
   */
  async suggestParameters(
    action: string,
    context: DesignContext,
    platform: 'corel' | 'blender',
  ): Promise<Record<string, ParameterSuggestion>> {
    this.logger.log(`Suggesting parameters for ${action} on ${platform}`);
    
    try {
      // Get suggestions from different sources
      const historicalParams = await this.getHistoricalParameters(action, platform);
      const contextParams = this.getContextBasedParameters(action, context, platform);
      const docParams = await this.getDocumentationParameters(action, platform);
      
      // Combine all suggestions, prioritizing based on confidence
      const combinedSuggestions = this.combineParameterSuggestions(
        historicalParams,
        contextParams,
        docParams,
      );
      
      this.logger.log(`Generated ${Object.keys(combinedSuggestions).length} parameter suggestions`);
      return combinedSuggestions;
    } catch (error) {
      this.logger.error(`Error suggesting parameters: ${error.message}`, error.stack);
      return {};
    }
  }

  /**
   * Retrieves parameters based on historical usage
   */
  private async getHistoricalParameters(
    action: string, 
    platform: string,
  ): Promise<Record<string, ParameterSuggestion>> {
    try {
      // Query conversation memory for similar actions
      const memories = await this.chromaService.queryConversationMemory(
        `parameters for ${action} in ${platform}`,
        5,
        0.3,
      );
      
      const suggestions: Record<string, ParameterSuggestion> = {};
      
      // Extract parameters from previous successful executions
      memories.forEach(memory => {
        if (memory.metadata?.parameters && memory.metadata?.action === action) {
          const params = memory.metadata.parameters;
          
          Object.entries(params).forEach(([name, value]) => {
            // If parameter already exists, increase confidence based on frequency
            if (suggestions[name]) {
              suggestions[name].confidence += 0.1;
              if (suggestions[name].confidence > 0.9) suggestions[name].confidence = 0.9;
            } else {
              suggestions[name] = {
                name,
                value,
                confidence: 0.7, // Start with moderate confidence for historical params
                source: 'history',
                explanation: `Based on ${memory.metadata?.commandId || 'previous use'}`,
              };
            }
          });
        }
      });
      
      return suggestions;
    } catch (error) {
      this.logger.warn(`Failed to get historical parameters: ${error.message}`);
      return {};
    }
  }

  /**
   * Derives parameters based on current design context
   */
  private getContextBasedParameters(
    action: string,
    context: DesignContext,
    platform: string,
  ): Record<string, ParameterSuggestion> {
    const suggestions: Record<string, ParameterSuggestion> = {};
    
    try {
      // Suggest position based on existing elements
      if (context.elements.length > 0 && ['create', 'add', 'insert'].some(act => action.includes(act))) {
        const positions = this.findOptimalPosition(context);
        suggestions['position'] = {
          name: 'position',
          value: positions,
          confidence: 0.8,
          source: 'context',
          explanation: 'Positioned based on existing layout',
        };
      }
      
      // Suggest size based on existing elements
      if (context.elements.length > 0 && ['create', 'resize', 'scale'].some(act => action.includes(act))) {
        const size = this.suggestSizeFromContext(context);
        suggestions['size'] = {
          name: 'size',
          value: size,
          confidence: 0.75,
          source: 'context',
          explanation: 'Sized relative to existing elements',
        };
      }
      
      // Suggest color based on document palette
      if (['color', 'fill', 'style'].some(act => action.includes(act)) || action.includes('create')) {
        const colors = this.suggestColorsFromContext(context);
        if (colors && colors.length > 0) {
          suggestions['color'] = {
            name: 'color',
            value: colors[0],
            confidence: 0.85,
            source: 'context',
            explanation: 'Matched to document color palette',
          };
        }
      }
      
      return suggestions;
    } catch (error) {
      this.logger.warn(`Failed to get context-based parameters: ${error.message}`);
      return {};
    }
  }

  /**
   * Gets parameters from API documentation
   */
  private async getDocumentationParameters(
    action: string,
    platform: string,
  ): Promise<Record<string, ParameterSuggestion>> {
    try {
      // Query API documentation for parameter information
      const docs = await this.chromaService.queryApiDocumentation(
        `parameters for ${action} in ${platform}`,
        3,
        0.4,
      );
      
      const suggestions: Record<string, ParameterSuggestion> = {};
      
      docs.forEach(doc => {
        if (doc.metadata?.parameters) {
          Object.entries(doc.metadata.parameters).forEach(([name, info]: [string, any]) => {
            suggestions[name] = {
              name,
              value: info.default || null,
              confidence: 0.6, // Documentation params have medium confidence
              source: 'documentation',
              explanation: info.description || 'From API documentation',
            };
          });
        }
      });
      
      return suggestions;
    } catch (error) {
      this.logger.warn(`Failed to get documentation parameters: ${error.message}`);
      return {};
    }
  }

  /**
   * Combines parameter suggestions from different sources
   */
  private combineParameterSuggestions(
    ...paramSets: Record<string, ParameterSuggestion>[]
  ): Record<string, ParameterSuggestion> {
    const combined: Record<string, ParameterSuggestion> = {};
    
    // Start with default parameters if needed
    
    // Combine all sources, prioritizing by confidence
    paramSets.forEach(paramSet => {
      Object.entries(paramSet).forEach(([name, suggestion]) => {
        // If parameter exists with higher confidence, don't override
        if (combined[name] && combined[name].confidence > suggestion.confidence) {
          return;
        }
        
        combined[name] = suggestion;
      });
    });
    
    return combined;
  }

  /**
   * Finds optimal position for new elements
   */
  private findOptimalPosition(context: DesignContext): { x: number, y: number } {
    // Default to center of canvas if empty
    if (!context.elements.length) {
      return { 
        x: context.canvasSize?.width ? context.canvasSize.width / 2 : 500,
        y: context.canvasSize?.height ? context.canvasSize.height / 2 : 500
      };
    }
    
    // Find empty space or align with existing elements
    // Implementation depends on specific layout algorithms
    
    // Simple implementation: find center of visible elements and offset
    const visibleElements = context.elements.filter(e => !e.hidden);
    if (!visibleElements.length) {
      return { 
        x: context.canvasSize?.width ? context.canvasSize.width / 2 : 500,
        y: context.canvasSize?.height ? context.canvasSize.height / 2 : 500
      };
    }
    
    // Calculate average center position
    let avgX = 0, avgY = 0;
    visibleElements.forEach(element => {
      if (element.position) {
        avgX += element.position.x + (element.size?.width || 0) / 2;
        avgY += element.position.y + (element.size?.height || 0) / 2;
      }
    });
    
    avgX /= visibleElements.length;
    avgY /= visibleElements.length;
    
    // Offset from center
    return {
      x: avgX + 50,
      y: avgY + 50
    };
  }

  /**
   * Suggests size based on existing elements
   */
  private suggestSizeFromContext(context: DesignContext): { width: number, height: number } {
    // Default size if no context
    if (!context.elements.length) {
      return { width: 100, height: 100 };
    }
    
    // Calculate average size of similar elements
    const sizes = context.elements
      .filter(e => e.size && e.size.width > 0 && e.size.height > 0)
      .map(e => e.size);
    
    if (!sizes.length) {
      return { width: 100, height: 100 };
    }
    
    // Calculate average size
    const avgWidth = sizes.reduce((sum, size) => sum + size.width, 0) / sizes.length;
    const avgHeight = sizes.reduce((sum, size) => sum + size.height, 0) / sizes.length;
    
    return {
      width: Math.round(avgWidth),
      height: Math.round(avgHeight)
    };
  }

  /**
   * Suggests colors based on document palette
   */
  private suggestColorsFromContext(context: DesignContext): any[] {
    // Extract colors from elements
    const colorMap = new Map<string, number>();
    
    context.elements.forEach(element => {
      if (element.color) {
        const colorKey = this.colorToString(element.color);
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
    });
    
    // Convert to array and sort by frequency
    const colorEntries = Array.from(colorMap.entries());
    colorEntries.sort((a, b) => b[1] - a[1]);
    
    // Convert back to color objects
    return colorEntries.slice(0, 5).map(([colorKey]) => this.stringToColor(colorKey));
  }
  
  /**
   * Converts color object to string for comparison
   */
  private colorToString(color: any): string {
    if (typeof color === 'string') return color;
    
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      const a = color.a !== undefined ? color.a : 1;
      return `rgba(${color.r},${color.g},${color.b},${a})`;
    }
    
    if (color.h !== undefined && color.s !== undefined && color.l !== undefined) {
      const a = color.a !== undefined ? color.a : 1;
      return `hsla(${color.h},${color.s},${color.l},${a})`;
    }
    
    return JSON.stringify(color);
  }
  
  /**
   * Converts string back to color object
   */
  private stringToColor(colorStr: string): any {
    // RGBA format
    const rgbaMatch = colorStr.match(/rgba\((\d+),(\d+),(\d+),([0-9.]+)\)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3]),
        a: parseFloat(rgbaMatch[4])
      };
    }
    
    // HSLA format
    const hslaMatch = colorStr.match(/hsla\((\d+),(\d+),(\d+),([0-9.]+)\)/);
    if (hslaMatch) {
      return {
        h: parseInt(hslaMatch[1]),
        s: parseInt(hslaMatch[2]),
        l: parseInt(hslaMatch[3]),
        a: parseFloat(hslaMatch[4])
      };
    }
    
    // Try parsing JSON
    try {
      return JSON.parse(colorStr);
    } catch {
      return colorStr;
    }
  }
} 