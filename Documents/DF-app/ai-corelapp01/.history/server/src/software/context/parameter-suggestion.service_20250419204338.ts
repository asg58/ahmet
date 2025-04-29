import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './design-context.interface';

/**
 * Parameter Suggestion Service
 * 
 * This service provides intelligent parameter suggestions for commands
 * based on design context, command history, and document analysis.
 */
@Injectable()
export class ParameterSuggestionService {
  private readonly logger = new Logger(ParameterSuggestionService.name);
  
  // Store command history for parameter suggestions
  private commandHistory: Record<string, Array<{
    action: string;
    parameters: Record<string, any>;
    context: Partial<DesignContext>;
    timestamp: number;
  }>> = {
    coreldraw: [],
    blender: []
  };
  
  constructor() {}
  
  /**
   * Suggest parameters for a design action based on history and context
   */
  async suggestParameters(
    platform: 'coreldraw' | 'blender',
    action: string,
    context: DesignContext
  ): Promise<Record<string, any>> {
    this.logger.debug(`Suggesting parameters for ${action} on ${platform}`);
    
    // Combine different sources for suggestions:
    
    // 1. Historical parameters for this action
    const historicalParams = this.extractHistoricalParameters(platform, action);
    
    // 2. Context-based parameters
    const contextParams = this.extractContextParameters(action, context);
    
    // 3. Document-analysis based parameters
    const documentParams = this.extractDocumentParameters(action, context);
    
    this.logger.debug(`Parameter suggestions: historical=${JSON.stringify(historicalParams)}, context=${JSON.stringify(contextParams)}, document=${JSON.stringify(documentParams)}`);
    
    // Combine and prioritize suggestions
    return {
      ...historicalParams,
      ...documentParams,
      ...contextParams  // Context has highest priority
    };
  }
  
  /**
   * Record a successful command execution for future parameter suggestions
   */
  recordCommand(
    platform: 'coreldraw' | 'blender',
    action: string,
    parameters: Record<string, any>,
    context: DesignContext
  ): void {
    this.logger.debug(`Recording command ${action} with parameters: ${JSON.stringify(parameters)}`);
    
    // Store simplified context to avoid huge objects
    const simplifiedContext = {
      selectedObjects: context.selectedObjects?.map(obj => ({ id: obj.id, type: obj.type })),
      viewportInfo: context.viewportInfo,
      documentProperties: context.documentProperties
    };
    
    // Add to history
    this.commandHistory[platform].push({
      action,
      parameters,
      context: simplifiedContext,
      timestamp: Date.now()
    });
    
    // Keep history manageable - limit to last 100 commands per platform
    if (this.commandHistory[platform].length > 100) {
      this.commandHistory[platform] = this.commandHistory[platform].slice(-100);
    }
  }
  
  /**
   * Extract parameters from command history
   */
  private extractHistoricalParameters(
    platform: 'coreldraw' | 'blender',
    action: string
  ): Record<string, any> {
    // Get command history for this action only
    const actionHistory = this.commandHistory[platform]
      .filter(entry => entry.action === action)
      .slice(-5); // Consider only the last 5 usages
    
    if (actionHistory.length === 0) {
      return {};
    }
    
    const paramFrequency: Record<string, Record<string | number, number>> = {};
    const paramValues: Record<string, any[]> = {};
    
    // Analyze parameter frequency and values
    actionHistory.forEach(entry => {
      Object.entries(entry.parameters).forEach(([param, value]) => {
        // Initialize if this parameter hasn't been seen yet
        if (!paramFrequency[param]) {
          paramFrequency[param] = {};
          paramValues[param] = [];
        }
        
        // Count frequency of values
        const valueKey = typeof value === 'string' ? value : JSON.stringify(value);
        paramFrequency[param][valueKey] = (paramFrequency[param][valueKey] || 0) + 1;
        
        // Store values for calculating averages for numeric parameters
        paramValues[param].push(value);
      });
    });
    
    // Generate suggestions based on frequency and averages
    const suggestions: Record<string, any> = {};
    
    Object.entries(paramFrequency).forEach(([param, frequencies]) => {
      // Find most frequent value
      const entries = Object.entries(frequencies);
      if (entries.length === 0) return;
      
      // Sort by frequency, highest first
      entries.sort((a, b) => b[1] - a[1]);
      const [mostFrequentValueKey, frequency] = entries[0];
      
      // Only suggest if it appears in more than 60% of the commands
      if (frequency / actionHistory.length >= 0.6) {
        try {
          // Try to parse JSON if it's not a simple string
          suggestions[param] = mostFrequentValueKey.startsWith('{') || mostFrequentValueKey.startsWith('[') ?
            JSON.parse(mostFrequentValueKey) : mostFrequentValueKey;
        } catch {
          // Fallback to using the string value
          suggestions[param] = mostFrequentValueKey;
        }
      }
      
      // For numeric parameters, suggest average if values are similar
      if (paramValues[param].every(v => typeof v === 'number')) {
        const numbers = paramValues[param] as number[];
        const avg = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
        
        // Check if values are close to each other (standard deviation < 20% of mean)
        const stdDev = Math.sqrt(numbers.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / numbers.length);
        
        if (stdDev < 0.2 * Math.abs(avg)) {
          suggestions[param] = Math.round(avg * 100) / 100; // Round to 2 decimal places
        }
      }
    });
    
    return suggestions;
  }
  
  /**
   * Extract parameters based on context (selected elements, viewport, etc.)
   */
  private extractContextParameters(
    action: string,
    context: DesignContext
  ): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Platform-specific and action-specific parameter suggestions
    switch (action) {
      case 'create_rectangle':
      case 'create_ellipse':
      case 'create_polygon':
        // Suggest position based on viewport center if nothing is selected
        if (!context.selectedObjects?.length && context.viewportInfo) {
          params.x = context.viewportInfo.centerX;
          params.y = context.viewportInfo.centerY;
        }
        
        // Suggest size based on viewport dimensions
        if (context.viewportInfo) {
          params.width = context.viewportInfo.width * 0.2;  // 20% of viewport width
          params.height = context.viewportInfo.height * 0.2; // 20% of viewport height
        }
        break;
        
      case 'create_text':
        // Center text in viewport
        if (context.viewportInfo) {
          params.x = context.viewportInfo.centerX;
          params.y = context.viewportInfo.centerY;
          params.fontSize = Math.round(context.viewportInfo.height * 0.05); // 5% of viewport height
        }
        break;
        
      case 'align_objects':
        if (context.selectedObjects?.length >= 2) {
          // Suggest horizontal or vertical alignment based on object distribution
          // Calculate bounding boxes
          const xPositions = context.selectedObjects.map(obj => obj.position?.x || 0);
          const yPositions = context.selectedObjects.map(obj => obj.position?.y || 0);
          
          // Check if objects are roughly in a horizontal or vertical line
          const xRange = Math.max(...xPositions) - Math.min(...xPositions);
          const yRange = Math.max(...yPositions) - Math.min(...yPositions);
          
          if (xRange > yRange * 2) {
            // Objects are arranged more horizontally
            params.alignment = 'vertical';  // Align vertically (same x-coordinate)
          } else if (yRange > xRange * 2) {
            // Objects are arranged more vertically
            params.alignment = 'horizontal'; // Align horizontally (same y-coordinate)
          }
        }
        break;
    }
    
    return params;
  }
  
  /**
   * Extract parameters based on document analysis
   */
  private extractDocumentParameters(
    action: string,
    context: DesignContext
  ): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Analyze document properties and other objects to suggest parameters
    switch (action) {
      case 'apply_style':
      case 'apply_fill':
      case 'apply_material':
        // Suggest colors based on document color theme if available
        if (context.documentProperties?.colorTheme?.length) {
          params.color = context.documentProperties.colorTheme[0]; // Use primary color
        }
        break;
        
      case 'create_text':
        // Suggest font based on document fonts
        if (context.documentProperties?.fonts?.length) {
          params.fontName = context.documentProperties.fonts[0]; // Use first font in document
        }
        break;
    }
    
    return params;
  }
} 