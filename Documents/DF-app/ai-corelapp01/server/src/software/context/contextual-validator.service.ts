import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './types/design-context.interface';
import { DesignElement } from './types/design-element.interface';
import { SoftwareContextService } from './software-context.service';

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

@Injectable()
export class ContextualValidatorService {
  private readonly logger = new Logger(ContextualValidatorService.name);

  constructor(private readonly contextService: SoftwareContextService) {}

  /**
   * Validates a command within the current design context
   * @param platform The design platform (CorelDRAW or Blender)
   * @param action The action to be performed
   * @param parameters The parameters for the action
   * @returns ValidationResult with validity, warnings and suggestions
   */
  async validateCommand(
    platform: string,
    action: string,
    parameters: Record<string, any>,
  ): Promise<ValidationResult> {
    this.logger.log(`Validating ${action} on ${platform} with parameters: ${JSON.stringify(parameters)}`);
    
    const currentContext = await this.contextService.getCurrentContext(platform);
    if (!currentContext) {
      return {
        isValid: false,
        warnings: ['No design context available for validation'],
        suggestions: ['Ensure the design software is running and connected'],
      };
    }

    // Perform specialized validation based on action type
    switch (action.toLowerCase()) {
      case 'delete':
      case 'remove':
        return this.validateDeletion(currentContext, parameters);
      case 'move':
      case 'position':
        return this.validatePositioning(currentContext, parameters);
      case 'resize':
      case 'scale':
        return this.validateResizing(currentContext, parameters);
      case 'style':
      case 'format':
        return this.validateStyling(currentContext, parameters);
      default:
        return this.performGeneralValidation(currentContext, action, parameters);
    }
  }

  /**
   * Validates deletion operations to prevent accidental bulk deletions
   */
  private validateDeletion(
    context: DesignContext,
    parameters: Record<string, any>,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // Check if attempting to delete multiple elements
    if (parameters.elementIds && Array.isArray(parameters.elementIds)) {
      if (parameters.elementIds.length > 5) {
        result.warnings.push(`Bulk deletion of ${parameters.elementIds.length} elements detected`);
        result.suggestions.push('Consider reviewing elements before deletion');
      }
    }

    // Check if attempting to delete important elements
    if (context.importantElements) {
      const targetIds = Array.isArray(parameters.elementIds) 
        ? parameters.elementIds 
        : [parameters.elementId];
      
      const importantElementsToDelete = context.importantElements.filter(
        element => targetIds.includes(element.id)
      );
      
      if (importantElementsToDelete.length > 0) {
        result.warnings.push('Some elements marked as important will be deleted');
        result.suggestions.push('Consider keeping important elements or duplicating before deletion');
      }
    }

    return result;
  }

  /**
   * Validates positioning operations to ensure they remain within canvas bounds
   */
  private validatePositioning(
    context: DesignContext,
    parameters: Record<string, any>,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // Check if position is within document bounds
    if (context.canvas && (parameters.x !== undefined || parameters.y !== undefined || parameters.z !== undefined)) {
      const { width, height, depth } = context.canvas;
      
      if (parameters.x !== undefined && (parameters.x < 0 || parameters.x > width)) {
        result.warnings.push(`X position (${parameters.x}) is outside canvas bounds (0-${width})`);
        result.suggestions.push(`Consider using a value between 0 and ${width}`);
      }
      
      if (parameters.y !== undefined && (parameters.y < 0 || parameters.y > height)) {
        result.warnings.push(`Y position (${parameters.y}) is outside canvas bounds (0-${height})`);
        result.suggestions.push(`Consider using a value between 0 and ${height}`);
      }
      
      if (depth && parameters.z !== undefined && (parameters.z < 0 || parameters.z > depth)) {
        result.warnings.push(`Z position (${parameters.z}) is outside canvas bounds (0-${depth})`);
        result.suggestions.push(`Consider using a value between 0 and ${depth}`);
      }
    }

    return result;
  }

  /**
   * Validates resizing operations to ensure proportional scaling and reasonable dimensions
   */
  private validateResizing(
    context: DesignContext,
    parameters: Record<string, any>,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // Check for very large or very small scales
    if (parameters.scale !== undefined) {
      if (parameters.scale > 10) {
        result.warnings.push(`Very large scale factor detected: ${parameters.scale}`);
        result.suggestions.push('Consider a smaller scale factor');
      } else if (parameters.scale < 0.1) {
        result.warnings.push(`Very small scale factor detected: ${parameters.scale}`);
        result.suggestions.push('Consider a larger scale factor');
      }
    }

    // Check width/height ratio preservation
    if (parameters.width !== undefined && parameters.height !== undefined) {
      // Find the element being resized
      const elementId = parameters.elementId;
      const element = context.elements?.find(e => e.id === elementId);
      
      if (element && element.width && element.height) {
        const originalRatio = element.width / element.height;
        const newRatio = parameters.width / parameters.height;
        
        // If ratios differ significantly
        if (Math.abs(originalRatio - newRatio) > 0.1) {
          result.warnings.push('Proportions will not be preserved');
          result.suggestions.push('Consider maintaining aspect ratio');
        }
      }
    }

    return result;
  }

  /**
   * Validates styling operations to ensure consistent styles across elements
   */
  private validateStyling(
    context: DesignContext,
    parameters: Record<string, any>,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // Track existing styles in document
    const existingStyles = new Map<string, number>();
    if (context.elements) {
      context.elements.forEach(element => {
        if (element.style) {
          const styleKey = JSON.stringify(element.style);
          existingStyles.set(styleKey, (existingStyles.get(styleKey) || 0) + 1);
        }
      });
    }

    // Check if style is consistent with document
    if (parameters.style) {
      const newStyleKey = JSON.stringify(parameters.style);
      if (!existingStyles.has(newStyleKey)) {
        result.warnings.push('Style differs from existing styles in document');
        
        // Find most similar style to suggest
        let mostSimilarStyle: string | null = null;
        let highestCount = 0;
        
        existingStyles.forEach((count, styleKey) => {
          if (count > highestCount) {
            mostSimilarStyle = styleKey;
            highestCount = count;
          }
        });
        
        if (mostSimilarStyle) {
          result.suggestions.push('Consider using a consistent style with other elements');
        }
      }
    }

    return result;
  }

  /**
   * Performs general validation for other action types
   */
  private performGeneralValidation(
    context: DesignContext,
    action: string,
    parameters: Record<string, any>,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // Check if elements exist
    if (parameters.elementId) {
      const elementExists = context.elements?.some(e => e.id === parameters.elementId);
      if (!elementExists) {
        result.warnings.push(`Element with ID ${parameters.elementId} not found`);
        result.suggestions.push('Verify the element ID or create the element first');
      }
    }
    
    // Validate against current context state
    if (action.toLowerCase().includes('export') && context.elements?.length === 0) {
      result.warnings.push('Attempting to export an empty document');
      result.suggestions.push('Add elements to the document before exporting');
    }

    return result;
  }
} 