import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './design-context';
import { DesignElement } from '../universal/design-concepts';

/**
 * Parameter Suggestion Service
 * 
 * This service provides intelligent parameter suggestions for commands
 * based on design context, command history, and document analysis.
 */
@Injectable()
export class ParameterSuggestionService {
  private readonly logger = new Logger(ParameterSuggestionService.name);
  
  // Store recent command history for parameter suggestion
  private commandHistory: Record<string, Array<{
    action: string;
    parameters: Record<string, any>;
    timestamp: number;
  }>> = {
    'coreldraw': [],
    'blender': []
  };
  
  // Maximum number of commands to keep in history per platform
  private readonly MAX_HISTORY_SIZE = 50;
  
  constructor() {
    this.logger.log('Parameter Suggestion Service initialized');
  }
  
  /**
   * Record a command execution for future reference
   */
  recordCommand(
    platform: 'coreldraw' | 'blender',
    action: string,
    parameters: Record<string, any>
  ): void {
    const platformHistory = this.commandHistory[platform];
    
    // Add new command to history
    platformHistory.push({
      action,
      parameters,
      timestamp: Date.now()
    });
    
    // Trim history if it exceeds maximum size
    if (platformHistory.length > this.MAX_HISTORY_SIZE) {
      platformHistory.shift();
    }
    
    this.logger.debug(`Recorded command ${platform}.${action} with ${Object.keys(parameters).length} parameters`);
  }
  
  /**
   * Suggest parameters for a command based on context and history
   */
  suggestParameters(
    platform: 'coreldraw' | 'blender',
    action: string,
    context: DesignContext
  ): Record<string, any> {
    this.logger.debug(`Suggesting parameters for ${platform}.${action}`);
    
    // Combine different sources for suggestions
    const historicalParams = this.extractHistoricalParameters(platform, action);
    const contextParams = this.extractContextParameters(action, context);
    const documentParams = this.extractDocumentParameters(action, context);
    
    // Combine and prioritize suggestions
    // Context has highest priority, then document analysis, then historical data
    return {
      ...historicalParams,
      ...documentParams,
      ...contextParams
    };
  }
  
  /**
   * Extract parameters based on command history
   */
  private extractHistoricalParameters(
    platform: 'coreldraw' | 'blender',
    action: string
  ): Record<string, any> {
    const platformHistory = this.commandHistory[platform];
    const relevantCommands = platformHistory.filter(cmd => cmd.action === action);
    
    if (relevantCommands.length === 0) {
      return {};
    }
    
    const parameterFrequency: Record<string, Record<string, number>> = {};
    const parameterValues: Record<string, any[]> = {};
    
    // Analyze parameter frequencies and values
    relevantCommands.forEach(cmd => {
      Object.entries(cmd.parameters).forEach(([key, value]) => {
        // Initialize if not exists
        if (!parameterFrequency[key]) {
          parameterFrequency[key] = {};
          parameterValues[key] = [];
        }
        
        // Count parameter value frequency
        const valueKey = JSON.stringify(value);
        parameterFrequency[key][valueKey] = (parameterFrequency[key][valueKey] || 0) + 1;
        
        // Store parameter values for numerical analysis
        if (typeof value === 'number') {
          parameterValues[key].push(value);
        }
      });
    });
    
    const historicalParams: Record<string, any> = {};
    
    // Get most frequent parameter values
    Object.entries(parameterFrequency).forEach(([key, valueFreq]) => {
      // Sort by frequency (descending)
      const sortedValues = Object.entries(valueFreq)
        .sort((a, b) => b[1] - a[1]);
      
      if (sortedValues.length > 0) {
        try {
          // Use most frequent value
          historicalParams[key] = JSON.parse(sortedValues[0][0]);
        } catch (e) {
          // Fallback if parsing fails
          this.logger.warn(`Failed to parse parameter value: ${e.message}`);
        }
      }
      
      // For numerical parameters, also consider average/median
      if (parameterValues[key] && parameterValues[key].length > 0) {
        const numValues = parameterValues[key];
        if (typeof numValues[0] === 'number') {
          // Use recent weighted average for numerical values if appropriate
          const weightedAvg = this.calculateWeightedAverage(numValues);
          if (!isNaN(weightedAvg)) {
            historicalParams[key] = weightedAvg;
          }
        }
      }
    });
    
    return historicalParams;
  }
  
  /**
   * Extract parameters based on current design context
   */
  private extractContextParameters(
    action: string,
    context: DesignContext
  ): Record<string, any> {
    const params: Record<string, any> = {};
    const selectedElements = context.selectedElements || [];
    
    // Different parameter suggestions based on action type
    switch (action) {
      case 'create_rectangle':
      case 'create_ellipse':
      case 'create_polygon':
      case 'create_text':
        // Suggest position
        if (selectedElements.length > 0) {
          // Position next to the last selected element
          const lastElement = selectedElements[selectedElements.length - 1];
          
          if (context.platform === 'coreldraw') {
            params.x = lastElement.position.x + (lastElement.size?.width || 100) + 20;
            params.y = lastElement.position.y;
          } else {
            params.location = [
              lastElement.position.x + 3,
              lastElement.position.y,
              lastElement.position.z || 0
            ];
          }
        } else {
          // Position in the center of view if no elements selected
          const viewTransform = context.viewTransform || { panX: 0, panY: 0 };
          
          if (context.platform === 'coreldraw') {
            params.x = context.size.width / 2 + viewTransform.panX;
            params.y = context.size.height / 2 + viewTransform.panY;
          } else {
            params.location = [0, 0, 0]; // Center in Blender
          }
        }
        
        // Suggest style properties from selected elements
        if (selectedElements.length > 0) {
          const referenceElement = selectedElements[0];
          
          if (context.platform === 'coreldraw') {
            if (referenceElement.color) {
              params.fillColor = referenceElement.color;
            }
            
            if (referenceElement.properties && referenceElement.properties.outlineColor) {
              params.outlineColor = referenceElement.properties.outlineColor;
            }
            
            if (action === 'create_text' && referenceElement.properties) {
              if (referenceElement.properties.fontSize) {
                params.fontSize = referenceElement.properties.fontSize;
              }
              
              if (referenceElement.properties.fontName) {
                params.fontName = referenceElement.properties.fontName;
              }
            }
          } else if (context.platform === 'blender') {
            if (referenceElement.properties && referenceElement.properties.material) {
              params.material = referenceElement.properties.material;
            }
          }
        }
        break;
      
      case 'rotate':
      case 'scale':
      case 'move':
        // Suggest transformation parameters
        if (action === 'rotate') {
          params.angle = 90; // Common rotation value
        } else if (action === 'scale') {
          params.factor = 1.5; // Common scale value
        } else if (action === 'move') {
          // Suggest move distance based on document size
          if (context.platform === 'coreldraw') {
            params.dx = 50;
            params.dy = 0;
          } else {
            params.offset = [1, 0, 0];
          }
        }
        break;
        
      case 'apply_material':
      case 'apply_style':
        // Suggest material/style parameters
        if (selectedElements.length > 0) {
          const referenceElement = selectedElements[0];
          
          if (context.platform === 'coreldraw') {
            params.fillColor = referenceElement.color || { r: 200, g: 200, b: 200 };
          } else {
            if (referenceElement.properties && referenceElement.properties.material) {
              params.materialName = referenceElement.properties.material;
            }
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
    
    // Analyze document structure for parameter suggestions
    const allElements = context.layers?.flatMap(layer => layer.elements) || [];
    
    if (allElements.length === 0) {
      return params;
    }
    
    // For creation actions, suggest size based on document content
    if (action.startsWith('create_')) {
      // Calculate average element size in the document
      const elementSizes = allElements
        .filter(el => el.size?.width && el.size?.height)
        .map(el => ({
          width: el.size.width,
          height: el.size.height
        }));
      
      if (elementSizes.length > 0) {
        const avgWidth = elementSizes.reduce((sum, size) => sum + size.width, 0) / elementSizes.length;
        const avgHeight = elementSizes.reduce((sum, size) => sum + size.height, 0) / elementSizes.length;
        
        params.width = Math.round(avgWidth);
        params.height = Math.round(avgHeight);
      }
    }
    
    // For style/material actions, suggest dominant styles from document
    if (action === 'apply_style' || action === 'apply_material') {
      // Analyze color usage
      const colorCounts: Record<string, number> = {};
      
      allElements.forEach(el => {
        if (el.color) {
          const colorKey = `${el.color.r},${el.color.g},${el.color.b}`;
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        }
      });
      
      // Find dominant color
      let dominantColorKey = '';
      let maxCount = 0;
      
      Object.entries(colorCounts).forEach(([key, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantColorKey = key;
        }
      });
      
      if (dominantColorKey) {
        const [r, g, b] = dominantColorKey.split(',').map(Number);
        params.color = { r, g, b };
      }
    }
    
    return params;
  }
  
  /**
   * Calculate weighted average for numerical parameters,
   * giving more weight to recent values
   */
  private calculateWeightedAverage(values: number[]): number {
    if (values.length === 0) return NaN;
    if (values.length === 1) return values[0];
    
    let sum = 0;
    let weightSum = 0;
    
    // Apply linear weighting (more recent = higher weight)
    for (let i = 0; i < values.length; i++) {
      const weight = i + 1; // Linear weight
      sum += values[i] * weight;
      weightSum += weight;
    }
    
    return Math.round((sum / weightSum) * 100) / 100; // Round to 2 decimal places
  }
} 